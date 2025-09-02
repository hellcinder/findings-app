import express from "express";
import cors from "cors";
import multer from "multer";
import { nanoid } from "nanoid";
import Database from "better-sqlite3";
import path from "node:path";
import fs from "node:fs";
import morgan from "morgan";

const app = express();
// TODO: In production, set CORS to your domain, e.g. { origin: "https://yourdomain.com" }
app.use(cors({ origin: true }));
app.use(morgan("dev"));

// Ensure data directories
const DATA_DIR = path.resolve("data");
const UPLOAD_DIR = path.join(DATA_DIR, "uploads");
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

// DB
const db = new Database(path.join(DATA_DIR, "findings.db"));
db.pragma("journal_mode = WAL");
db.exec(`
CREATE TABLE IF NOT EXISTS findings (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  title TEXT NOT NULL,
  date TEXT NOT NULL,
  type TEXT NOT NULL,
  severity TEXT NOT NULL,
  priority TEXT,
  environment TEXT NOT NULL,
  area TEXT NOT NULL,
  reporter TEXT NOT NULL,
  version TEXT,
  expected TEXT NOT NULL,
  actual TEXT NOT NULL,
  steps TEXT NOT NULL,
  evidence_url TEXT,
  attachment_name TEXT,
  attachment_path TEXT,
  status TEXT NOT NULL,
  assignee TEXT,
  tags TEXT
);
`);

// File upload (multer)
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, UPLOAD_DIR),
  filename: (_, file, cb) => {
    const unique = `${Date.now()}-${nanoid(6)}`;
    const ext = path.extname(file.originalname || "");
    cb(null, `evidence-${unique}${ext}`);
  }
});
const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024 // 15MB
  }
});

// POST /api/findings  (multipart/form-data)
app.post("/api/findings", upload.single("attachment"), (req, res) => {
  try {
    const required = [
      "title","date","type","severity","environment","area","reporter",
      "expected","actual","steps","status"
    ];
    for (const k of required) {
      if (!req.body[k]) return res.status(400).json({ error: `Missing field: ${k}` });
    }

    const id = nanoid(12);
    const created_at = new Date().toISOString();

    const stmt = db.prepare(`
      INSERT INTO findings (
        id, created_at, title, date, type, severity, priority,
        environment, area, reporter, version, expected, actual, steps,
        evidence_url, attachment_name, attachment_path, status, assignee, tags
      ) VALUES (
        @id, @created_at, @title, @date, @type, @severity, @priority,
        @environment, @area, @reporter, @version, @expected, @actual, @steps,
        @evidence_url, @attachment_name, @attachment_path, @status, @assignee, @tags
      )
    `);

    stmt.run({
      id,
      created_at,
      title: req.body.title,
      date: req.body.date,
      type: req.body.type,
      severity: req.body.severity,
      priority: req.body.priority || null,
      environment: req.body.environment,
      area: req.body.area,
      reporter: req.body.reporter,
      version: req.body.version || null,
      expected: req.body.expected,
      actual: req.body.actual,
      steps: req.body.steps,
      evidence_url: req.body.evidenceUrl || null,
      attachment_name: req.file?.originalname || null,
      attachment_path: req.file?.filename ? `/uploads/${req.file.filename}` : null,
      status: req.body.status,
      assignee: req.body.assignee || null,
      tags: req.body.tags || null
    });

    return res.status(201).json({ id, created_at });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: "Server error" });
  }
});

// List (basic) — GET /api/findings?limit=50
app.get("/api/findings", (req, res) => {
  const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);
  const rows = db.prepare(
    `SELECT id, created_at, title, severity, status, assignee, tags
     FROM findings ORDER BY created_at DESC LIMIT ?`
  ).all(limit);
  res.json(rows);
});

// Detail — GET /api/findings/:id
app.get("/api/findings/:id", (req, res) => {
  const row = db.prepare(`SELECT * FROM findings WHERE id = ?`).get(req.params.id);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// Serve uploaded files statically (read-only)
app.use("/uploads", express.static(UPLOAD_DIR));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Findings API listening on http://localhost:${PORT}`);
});
