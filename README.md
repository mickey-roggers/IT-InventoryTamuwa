# Tamuwa IT Inventory

An internal inventory and operations platform for tracking company IT assets from procurement through assignment, maintenance, and retirement.

The repository contains a Django REST API and a separate Next.js application. The frontend sends authenticated requests through its own server-side proxy, keeping access and refresh tokens out of browser JavaScript.

The production Django backend is deployed at [https://ict-inventory.up.railway.app](https://ict-inventory.up.railway.app). The frontend defaults to this origin unless its API environment variables are overridden for local development.

```text
Browser → Next.js frontend → /api/backend proxy → Django REST API → SQLite/PostgreSQL
                                          └────→ Django admin
```

## Features

- Asset register, assignment history, status lifecycle, and Excel export
- Maintenance records, technician services, and recommendations
- Requisition approval and purchased-item processing workflows
- Issue, project, and task tracking
- People and department directory
- Dashboard metrics, activity history, and operational alerts
- Role-based access for super administrators, administrators, technicians, and viewers
- Django admin for direct data administration

## Technology

| Area | Stack |
| --- | --- |
| Frontend | Next.js 16, React 19, TypeScript, Tailwind CSS 4, SWR, Recharts |
| Backend | Django 5, Django REST Framework, Simple JWT |
| Database | SQLite for local development; PostgreSQL in production |
| Operations | Gunicorn, WhiteNoise, Railway configuration |

## Repository layout

```text
IT-InventoryTamuwa/
├── backend/                 # Django project, REST API, admin, and legacy templates
│   ├── api/                 # Central API router and viewsets
│   ├── assets/              # Assets, categories, assignments, and exports
│   ├── inventory_system/    # Django settings and root URLs
│   ├── issues/              # Issues and projects
│   ├── maintenance/         # Maintenance records
│   ├── requisition/         # Procurement workflows
│   ├── tasks/               # Task tracking
│   ├── technicians/         # Technician records and services
│   └── users/               # Authentication, profiles, roles, and directory
└── frontend/                # Next.js App Router application
    └── src/
        ├── app/             # Pages and server-side API routes
        ├── components/      # Tailwind components and application UI
        └── lib/             # API clients, types, and formatting helpers
```

## Prerequisites

- Python 3.12 recommended
- Node.js 20.9 or newer
- npm

PostgreSQL is optional locally; Django uses SQLite when `DATABASE_URL` is not set.

## Local setup

### 1. Backend

From the repository root in PowerShell:

```powershell
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r backend\requirements.txt

Copy-Item backend\.env.example backend\.env
python backend\manage.py migrate
python backend\manage.py init_defaults
python backend\manage.py createsuperuser
python backend\manage.py runserver 8000
```

On macOS or Linux, activate the environment with `source .venv/bin/activate` and use `/` in paths.

### 2. Frontend

Open a second terminal:

```powershell
cd frontend
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

| Service | Local URL |
| --- | --- |
| Next.js application | [http://localhost:3000](http://localhost:3000) |
| Django application | [http://127.0.0.1:8000](http://127.0.0.1:8000) |
| Django admin | [http://127.0.0.1:8000/admin/](http://127.0.0.1:8000/admin/) |
| API root | [http://127.0.0.1:8000/api/](http://127.0.0.1:8000/api/) |
| Health check | [http://127.0.0.1:8000/health/](http://127.0.0.1:8000/health/) |

## Environment variables

Start from the committed example files; do not commit real credentials.

### Backend: `backend/.env`

| Variable | Purpose |
| --- | --- |
| `SECRET_KEY` | Django signing key; replace it outside local development |
| `DEBUG` | `True` or `False` |
| `ALLOWED_HOSTS` | Comma-separated Django hosts |
| `DATABASE_URL` | Optional PostgreSQL connection; omitted means SQLite |
| `CORS_ALLOWED_ORIGINS` | Comma-separated trusted frontend origins |
| `DJANGO_SUPERUSER_*` | Optional credentials used by deployment initialization |

### Frontend: `frontend/.env.local`

| Variable | Purpose |
| --- | --- |
| `DJANGO_API_URL` | Django origin reachable by the Next.js server |
| `NEXT_PUBLIC_DJANGO_URL` | Public Django origin used for the admin link |

Do not add a trailing slash to either frontend URL value.

Both variables default to `https://ict-inventory.up.railway.app`. Set them to `http://127.0.0.1:8000` only when running Django locally.

## Useful commands

### Backend

Run these from `backend/` with the virtual environment active:

```powershell
python manage.py test                  # Run the Django test suite
python manage.py init_defaults         # Create default statuses and maintenance actions
python manage.py seed_data             # Add development sample data
python manage.py verify_data_integrity # Check inventory relationships
python manage.py collectstatic         # Build production static files
```

`seed_data` creates local demonstration records, including a test account. Do not run it against production data.

### Frontend

Run these from `frontend/`:

```powershell
npm run dev    # Development server
npm run lint   # ESLint checks
npm run build  # Production build and TypeScript validation
npm run start  # Serve an existing production build
```

## Authentication

The Django API issues JWT access and refresh tokens. Next.js stores them in HTTP-only, same-site cookies and forwards API calls through `/api/backend/*`. Client components therefore never need direct access to the tokens.

## Deployment

The backend is deployed on Railway at [https://ict-inventory.up.railway.app](https://ict-inventory.up.railway.app). Its `backend/railway.json` deployment process runs migrations, ensures a superuser exists, initializes default data, collects static files, and starts Gunicorn. Configure all production secrets in the hosting platform rather than committing `.env` files.

The frontend can be deployed anywhere that supports Next.js. Set both frontend environment variables to the deployed Django origin and ensure that origin is allowed by the backend CORS and host settings.

## License

Internal use — Tamuwa ICT Department.
