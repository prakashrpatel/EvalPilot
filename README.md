# EvalPilot — MVP (P0)

A working slice of the EvalPilot PRD: create a project, build a golden
dataset, define rubric checks, run an eval against model outputs, review
failures as a human, and track launch readiness on a dashboard.

Covers 9 of the 10 "P0: Must Have" modules from PRD section 19 — project
setup, golden dataset manager, rubric builder, CSV/JSON import, eval
runner, deterministic rule checks, human review queue, results dashboard,
and version comparison. **LLM-as-judge scoring is deliberately deferred**
(needs a model provider + API key decision) — deterministic rubric checks
(exact match, keyword contains/forbidden, regex, JSON validity, reference
similarity) drive scoring for now. Synthetic test generation, PII
redaction, and production monitoring (P1/P2) are not built yet.

## Stack

- **Frontend**: Next.js 16 (App Router) + TypeScript + Tailwind CSS
- **Backend**: FastAPI + SQLAlchemy
- **Database**: PostgreSQL (via Docker Compose)

## Running it

### 1. Start Postgres

```bash
cd backend
docker compose up -d
```

Requires Docker Desktop. If you don't have Docker, point `DATABASE_URL`
(see `.env.example`) at any Postgres instance, or use SQLite for local
testing: `DATABASE_URL=sqlite:///./dev.db`.

### 2. Start the backend

```bash
cd backend
python -m venv .venv
./.venv/Scripts/pip install -r requirements.txt   # .venv/bin/pip on macOS/Linux
./.venv/Scripts/python -m uvicorn app.main:app --reload   # .venv/bin/python on macOS/Linux
```

API runs at http://localhost:8000. Tables are created automatically on
startup (no migrations yet — this is a prototype).

### 3. Start the frontend

```bash
cd frontend
npm install
npm run dev
```

App runs at http://localhost:3000. It talks to the API at the URL in
`frontend/.env.local` (`NEXT_PUBLIC_API_URL`, defaults to
`http://localhost:8000`).

## Using it

1. Create a project (Home page) — name it and pick a use case type.
2. **Dataset** tab — add golden test cases manually, or import a CSV/JSON
   file with columns: `input_prompt, expected_output, context, tags,
   severity, is_golden`.
3. **Rubrics** tab — add one or more scoring criteria (exact match,
   contains keywords, forbidden words, regex, valid JSON, reference
   similarity). Mark critical ones as launch blockers.
4. **Run Eval** tab — pick the dataset, paste in the AI/model output for
   each test case (or bulk-paste a `{test_case_id: output}` JSON blob),
   name the run (e.g. a prompt version label), and run it.
5. **Review Queue** tab — every failed result across all eval runs in the
   project lands here for human review: agree with the automated fail,
   override to pass/fail, leave a comment, and optionally provide a
   corrected/ideal answer. Reviewed items drop out of the pending queue
   (switch the dropdown to "All" to see review history).
6. **Dashboard** tab — see pass rate, launch readiness, per-metric
   breakdowns, and failing results (with reviewer verdicts/comments where
   reviewed). Use "Compare two runs" to check for regressions between
   versions.

## Project layout

```
backend/
  app/
    models.py       # SQLAlchemy models: Project, Dataset, TestCase, Rubric, EvalRun, EvalResult
    schemas.py       # Pydantic request/response schemas
    evaluators.py    # Deterministic rubric check implementations
    routers/         # projects, datasets, rubrics, evals
  docker-compose.yml # Postgres for local dev
frontend/
  app/               # Next.js routes (home, /projects/[id])
  components/        # ProjectDetail + tab components (Dataset, Rubrics, Run Eval, Review Queue, Dashboard)
  lib/                # API client + TypeScript types
```
