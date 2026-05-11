# AI Forms (v1 MVP)

Web application for building and publishing forms with AI-assisted draft generation via Cerebras.

## Stack

- Backend: Python 3.11+, FastAPI, SQLAlchemy 2.x, Alembic, PostgreSQL
- Frontend: React 18 + TypeScript + Vite + TailwindCSS
- Auth: JWT (access + refresh) in HttpOnly cookies, CSRF protection (double-submit token)
- AI: Cerebras structured JSON output (`response_format: json_schema`, `strict: true`)
- Deploy: Docker + docker-compose

## Implemented MVP assumptions

- Single role per user (`admin | creator | respondent`)
- Export format: CSV only
- No file-upload question type in v1

## Project structure

```text
project/
+-- backend/
¦   +-- app/
¦   +-- migrations/
¦   +-- tests/
¦   +-- requirements.txt
¦   +-- main.py
+-- frontend/
¦   +-- src/
¦   +-- public/
¦   +-- package.json
+-- docker-compose.yml
+-- .env.example
+-- README.md
```

## Environment

1. Copy `.env.example` to `.env`.
2. Set required values:
   - `SECRET_KEY`
   - `DATABASE_URL`
   - `CEREBRAS_API_KEY`
   - `FRONTEND_BASE_URL` / `BACKEND_BASE_URL`

## Run with Docker

```bash
docker-compose up --build
```

Services:

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`
- PostgreSQL: `localhost:5432`

## Backend local run

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
alembic upgrade head
uvicorn app.main:app --reload
```

## Frontend local run

```bash
cd frontend
npm install
npm run dev
```

## API overview (`/api/v1`)

### Auth

- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me`

### Forms

- `GET /forms`
- `POST /forms`
- `GET /forms/{id}`
- `PUT /forms/{id}`
- `DELETE /forms/{id}`
- `POST /forms/{id}/publish`
- `POST /forms/generate-ai`
- `GET /forms/public/{slug}`

### Responses / analytics

- `POST /forms/{id}/submit`
- `GET /forms/{id}/responses`
- `GET /forms/{id}/responses/export`
- `GET /forms/{id}/analytics`

## Security details

- Password hashing: bcrypt
- Access token TTL: 15 minutes
- Refresh token TTL: 7 days
- Tokens in HttpOnly cookies
- CSRF protection for mutating authenticated endpoints via `X-CSRF-Token` header
- Payload size limit: 10MB middleware check

## AI generation

Endpoint: `POST /api/v1/forms/generate-ai`

Input:

```json
{ "prompt": "Создай форму обратной связи по мероприятию..." }
```

Behavior:

- Sends prompt to Cerebras chat completion API
- Enforces strict JSON schema output
- Returns draft form DTO (not persisted)

## Tests

Backend tests are in `backend/tests`:

- Unit:
  - question validation rules
  - AI draft parsing and schema validation
  - one-response-per-user logic
- Integration:
  - auth flow with cookies + CSRF
  - full create/publish/submit/analytics/export flow

Run:

```bash
python -m pytest backend/tests -q
```

## Notes

- Redis is optional in `docker-compose` under `optional` profile.
- For AI checks, provide a valid `CEREBRAS_API_KEY` in `.env`.


