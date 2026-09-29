# Tamuwa IT Inventory

The project is split into two independent applications:

- `backend/` — Django 5 + Django REST Framework API and the existing admin site.
- `frontend/` — Next.js App Router frontend with TypeScript, Tailwind CSS, and shadcn/ui.

## Local development

### Backend

```powershell
cd backend
..\venv\Scripts\python.exe manage.py runserver 8000
```

Copy `backend/.env.example` to `backend/.env` and set a valid boolean for `DEBUG` (`True` or `False`).

### Frontend

```powershell
cd frontend
Copy-Item .env.example .env.local
npm install
npm run dev
```

Open `http://localhost:3000`. The frontend talks to Django through a server-side proxy, so JWT tokens remain in HTTP-only cookies.
