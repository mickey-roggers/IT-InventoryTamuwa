# Tamuwa IT Inventory Frontend

The Next.js interface for the Tamuwa IT Inventory platform. It provides responsive inventory, maintenance, procurement, project, task, directory, notification, and user-management workflows backed by the Django REST API.

For full project setup and backend instructions, see the [repository README](../README.md).

## Stack

- Next.js 16 App Router
- React 19 and TypeScript
- Tailwind CSS 4 with local reusable components
- SWR for client-side fetching and cache updates
- Recharts for dashboard visualizations
- Lucide React for icons

## How requests flow

Browser-facing components call `/api/backend/*`. The Next.js route handler forwards those requests to `DJANGO_API_URL`, attaches the JWT stored in HTTP-only cookies, and refreshes expired access tokens when possible.

```text
Client component → apiFetch() → Next.js proxy → Django /api/*
                                ↑
                         HTTP-only JWT cookies
```

This keeps backend credentials out of client-side JavaScript and avoids calling Django directly from the browser.

## Setup

Requires Node.js 20.9 or newer. By default, the frontend uses the deployed Railway backend; override the environment variables to use a local Django server.

```powershell
Copy-Item .env.example .env.local
npm ci
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Default | Purpose |
| --- | --- | --- |
| `DJANGO_API_URL` | `https://ict-inventory.up.railway.app` | Django origin as seen by the Next.js server |
| `NEXT_PUBLIC_DJANGO_URL` | `https://ict-inventory.up.railway.app` | Public origin used for the Django admin link |

Do not include trailing slashes.

To use a local backend, set both values in `.env.local` to `http://127.0.0.1:8000`.

## Commands

```powershell
npm run dev    # Start the development server
npm run lint   # Run ESLint
npm run build  # Compile production assets and validate TypeScript
npm run start  # Serve a completed production build
```

## Source layout

```text
src/
├── app/
│   ├── (app)/              # Authenticated application routes
│   ├── api/auth/           # Login, logout, and session handlers
│   ├── api/backend/        # Authenticated Django proxy
│   └── login/              # Public login route
├── components/
│   ├── providers/          # Authentication context
│   ├── ui/                 # Local Tailwind primitives
│   └── *.tsx               # Shared application components
└── lib/
    ├── api.ts              # Browser API client
    ├── server-api.ts       # Server-only Django and cookie helpers
    ├── types.ts            # API data types
    └── utils.ts            # Shared utilities
```

## UI conventions

- UI primitives are local React components styled with Tailwind; the project does not use shadcn or Radix.
- Reuse components from `src/components/ui` before introducing duplicate styles.
- Keep backend requests inside `apiFetch()` or server-side API helpers so authentication behavior remains consistent.
- Run both lint and the production build before merging frontend changes.
