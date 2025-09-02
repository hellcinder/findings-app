# Findings App (Frontend + Backend)

A simple findings tracker you can run locally. Frontend is a single HTML page; backend is Node + Express + SQLite with file uploads.

## Quick Start

### Backend
```bash
cd backend
npm install
npm run dev
# Server runs at http://localhost:3000
```

### Frontend
Open `frontend/index.html` in your browser.
(If you need to serve it, any static server works, e.g. `python -m http.server 5173` then visit http://localhost:5173)

## Configuration

- **CORS** is open for demo (`origin: true`). In production, set it to your site domain.
- **Uploads** are stored in `backend/data/uploads/`.
- **Database** is `backend/data/findings.db`.

## API

- `POST /api/findings` — Create a finding (multipart/form-data with optional `attachment` file).
- `GET /api/findings?limit=50` — List recent findings.
- `GET /api/findings/:id` — Get finding by id.
- `GET /uploads/<filename>` — Access your uploaded evidence file.

## Hardening Checklist
- Restrict CORS origins.
- Add auth (JWT/session/API key) before allowing public writes.
- Validate inputs (e.g., with Zod or express-validator).
- Limit file size/types and scan uploads.
- Back up the SQLite DB.
