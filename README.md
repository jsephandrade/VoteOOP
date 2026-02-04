# VoteOOP

VoteOOP is a simple online voting demo that now uses a SQLite-backed API for persistence and scalability.
It supports voter registration, election enrollment, ballot casting, and admin-only election closure.

## Stack

- Node.js + Express API
- Prisma ORM + SQLite (`dev.db`)
- Vanilla JS frontend

## Getting Started (Dev)

1) Clone and install

```
git clone <repo-url>
cd VoteOOP
npm install
```

2) Create `.env` (or copy `.env.example`)

```
DATABASE_URL="file:./dev.db"
ADMIN_PASSWORD="admin123"
ADMIN_JWT_SECRET="change-this-in-production"
ADMIN_TOKEN_TTL="8h"
```

3) Run migrations and start (uses SQLite via `.env`)

```
npm run migrate
npm start
```

4) Open the UI

- http://localhost:3000
- Or serve `index.html` via a static server on another port; the UI will call the API on `:3000`.

## Scripts

- `npm start` - start the API + UI server
- `npm run migrate` - run Prisma migrations (creates `dev.db`)
- `npm run generate` - regenerate Prisma client

## API Overview

- `POST /api/voter/register` { name, nationalId, dateOfBirth }
- `GET /api/elections/ongoing`
- `GET /api/election/:eid/candidates`
- `POST /api/election/:eid/register` { voterId }
- `POST /api/election/:eid/vote` { voterId, candidateId }
- `GET /api/election/:eid/results`
- `POST /api/admin/login` { password }
- `POST /api/election/:eid/close` (Admin token required)

## Admin Flow

1) Login: `POST /api/admin/login`
2) Use the returned token as: `Authorization: Bearer <token>`
3) Close election: `POST /api/election/:eid/close`

## Notes

- SQLite is used for local dev. The database file is `dev.db`.
- For production, set a strong `ADMIN_JWT_SECRET`.
