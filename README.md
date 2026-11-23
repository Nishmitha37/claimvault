# ClaimVault

**Warranty, return and receipt management system.** Track what you buy, store the receipts, see when return windows and warranties end, and manage warranty claims in one place.

Built with React, FastAPI and MySQL.



## Features

- **Authentication:** register, log in, log out. JWT tokens, bcrypt password hashing, protected routes.
- **Products:** add, edit, delete and view products. Search, filter by category and warranty status, and sort by expiry date.
- **Receipt vault:** upload PDF, JPG or PNG receipts (max 5 MB), preview, download and delete them. Each receipt belongs to a product.
- **Deadline tracking:** return and warranty deadlines are tracked separately, with a countdown and a status: Expired, Urgent (0-7 days), Upcoming (8-30 days) or Active (31+ days).
- **Action Center:** in-app reminders for deadlines closing within 30 days. Urgent items are highlighted, each links to its product, and users can acknowledge them.
- **Dashboard:** total products, active and expired warranties, upcoming deadlines, total spending, spending by category chart, recent products and a deadline timeline.
- **Warranty claims:** create claims with a reference number and description, update the status (Open, Submitted, In Repair, Resolved, Rejected) and view the full status history.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React (Vite), JavaScript, Tailwind CSS, React Router, Axios, Recharts, Lucide React |
| Backend | Python 3.12, FastAPI, SQLAlchemy, Pydantic, PyJWT, bcrypt, Uvicorn |
| Database | MySQL 8.0 (PyMySQL driver) |
| Storage | Local disk for receipt files, MySQL for file metadata |
| Testing | pytest |

## Project structure

```
claimvault/
├── backend/
│   ├── app/
│   │   ├── main.py            # app setup, CORS, error handling
│   │   ├── config.py          # settings from environment variables
│   │   ├── database.py        # engine and session
│   │   ├── models/            # SQLAlchemy models
│   │   ├── schemas/           # Pydantic request/response models
│   │   ├── routes/            # auth, products, receipts, reminders, dashboard, claims
│   │   ├── services/          # deadline and reminder logic
│   │   ├── dependencies/      # current user and ownership checks
│   │   └── utils/             # password hashing, JWT
│   ├── tests/
│   ├── uploads/               # receipt files (not committed)
│   ├── schema.sql
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   └── src/
│       ├── components/
│       ├── pages/
│       ├── services/          # Axios API layer
│       ├── context/           # auth state
│       ├── App.jsx
│       └── main.jsx
├── .gitignore
└── README.md
```

## Getting started (Windows 11, PowerShell)

### Prerequisites

- Python 3.12
- Node.js 18 or newer
- MySQL 8.0, running locally

### 1. Create the database

```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS claimvault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

If `mysql` is not recognised, call it by full path, for example `& "C:\Program Files\MySQL\MySQL Server 8.0\bin\mysql.exe" -u root -p`. The tables are created automatically when the backend starts. `backend/schema.sql` has the same schema if you want to apply it manually.

### 2. Run the backend

```powershell
cd claimvault\backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
```

Open `backend\.env` and set:

- `SECRET_KEY`: paste the generated value.
- `DATABASE_URL`: put your MySQL password in place of `YOUR_PASSWORD`. Special characters must be URL-encoded (for example `@` becomes `%40`).

Then start the server:

```powershell
uvicorn app.main:app --reload --port 8000
```

API documentation is available at http://127.0.0.1:8000/docs.

If PowerShell blocks the activate script, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once.

### 3. Run the frontend

In a second PowerShell window:

```powershell
cd claimvault\frontend
npm install
npm run dev
```

Open http://localhost:5173 and register an account. The dev server proxies `/api` requests to the backend on port 8000.

## Running the tests

```powershell
cd claimvault\backend
.\.venv\Scripts\Activate.ps1
pytest
```

There are 27 tests covering registration and login, unauthorized access, product CRUD, cross-user access restrictions, deadline calculations, receipt upload validation, reminder acknowledgements and claim status changes. They run against a temporary SQLite database, so they never touch your MySQL data.

## API overview

All endpoints except register and login require a `Authorization: Bearer <token>` header.

| Area | Endpoints |
|---|---|
| Auth | `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me` |
| Products | `GET/POST /api/products`, `GET/PUT/DELETE /api/products/{id}` |
| Receipts | `POST /api/products/{id}/receipts`, `GET /api/receipts`, `GET /api/receipts/{id}/file`, `DELETE /api/receipts/{id}` |
| Reminders | `GET /api/reminders`, `POST /api/reminders/acknowledge` |
| Dashboard | `GET /api/dashboard`, `GET /api/deadlines` |
| Claims | `GET/POST /api/claims`, `GET /api/claims/{id}`, `PATCH /api/claims/{id}/status`, `DELETE /api/claims/{id}` |

## Design decisions

- **Data isolation:** every query is filtered by the logged-in user, and ownership is checked before any read, update, delete or file access. Another user's record returns 404.
- **Receipt security:** the real file type is checked from the file's bytes, not only the extension. Files are saved with random names and are served only through authenticated endpoints, never as public static files.
- **Reminders:** they are calculated from the current deadlines each time, so the same reminder can never appear twice. Acknowledgements are stored per product, deadline type and deadline date. If a deadline is changed, a fresh reminder appears.
- **Configuration:** secrets and database credentials come from environment variables. The app refuses to start without a `SECRET_KEY` of at least 32 characters.


