# ClaimVault — Smart Warranty, Return & Receipt Management

React (Vite, Tailwind) + FastAPI + MySQL 8. Track purchases, store receipts, watch warranty/return deadlines, get in-app reminders and manage warranty claims.

## Prerequisites (Windows 11)
- Python 3.12, Node.js 18+ (20 LTS recommended), MySQL 8.0 running locally

## 1. Database
Open PowerShell and create the database (enter your MySQL root password when asked):

```powershell
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS claimvault CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```
The tables are created automatically when the backend starts. `backend/schema.sql` contains the same schema if you prefer to apply it by hand:
`Get-Content backend\schema.sql | mysql -u root -p`

## 2. Backend
```powershell
cd claimvault\backend
py -3.12 -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
python -c "import secrets; print(secrets.token_urlsafe(48))"
```
Edit `backend\.env`: paste the generated value into `SECRET_KEY` and set your MySQL password inside `DATABASE_URL` (URL-encode special characters, e.g. `@` becomes `%40`). The app refuses to start without a SECRET_KEY of 32+ characters.

If PowerShell blocks the activate script: `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned`.

```powershell
uvicorn app.main:app --reload --port 8000
```
API docs: http://127.0.0.1:8000/docs

## 3. Frontend (second PowerShell window)
```powershell
cd claimvault\frontend
npm install
npm run dev
```
Open http://localhost:5173 and register an account. The dev server proxies `/api` to the backend on port 8000.

## Tests
```powershell
cd claimvault\backend
.\.venv\Scripts\Activate.ps1
pytest
```
Tests run against a temporary SQLite database, so they never touch your MySQL data.

## Design notes
- **Auth:** bcrypt password hashes, JWT bearer tokens (default 8 h). Logout clears the token in the browser; tokens are stateless, so there is no server-side revocation.
- **Isolation:** every query is scoped to the logged-in user; other users' records return 404.
- **Receipts:** PDF/JPG/PNG up to 5 MB. Type is verified from file contents (not just the extension), files are stored under `backend/uploads/<user_id>/` with random names, and are only served through authenticated endpoints.
- **Deadline statuses:** Expired (past), Urgent (0–7 days), Upcoming (8–30 days), Active (31+ days). Thresholds live in `config.py`.
- **Action Center:** reminders are derived from live deadlines (return and warranty separately, within 30 days), so duplicates cannot occur. Acknowledgements are stored per product, type and deadline date; changing a deadline creates a fresh reminder.
- **Currency:** displayed as INR; change `CURRENCY` in `frontend/src/utils.js`.
