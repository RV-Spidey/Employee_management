### Employee Management System

Comprehensive employee management app with a vanilla JS front‑end and an Express + PostgreSQL backend. Features include add/edit/delete, instant search and filters, client-side sorting and pagination, and one‑click CSV/Excel exports.

---

## Stack Overview

- **Runtime**: Node.js 18+
- **Web framework**: Express 4
- **Database**: PostgreSQL (via `pg` pool)
- **Env management**: `dotenv`
- **Frontend**: Vanilla JavaScript, HTML, CSS (no frameworks)
- **Exports**: Excel via `ExcelJS` (browser CDN), CSV via native Blob API

Directory layout:

```text
public/          # static assets (HTML, CSS, JS)
  index.html     # UI + ExcelJS CDN include
  styles.css     # styling
  app.js         # UI logic, API calls, sorting, filters, pagination, export
server.js        # Express server + API routes + DB init
package.json     # scripts and dependencies
```

---

## Database

- Uses a single `employees` table, created automatically on server start.
- Enforces unique emails case‑insensitively via an index on `LOWER(email)`.

Schema created by the server:

```sql
CREATE TABLE IF NOT EXISTS employees (
  id TEXT PRIMARY KEY,
  firstName TEXT NOT NULL,
  lastName TEXT NOT NULL,
  email TEXT NOT NULL,
  department TEXT NOT NULL,
  salary INTEGER NOT NULL
);

-- Unique index (case-insensitive) on email
CREATE UNIQUE INDEX employees_email_lower_unique ON employees (LOWER(email));
```

Connection is provided by the `DATABASE_URL` environment variable (standard Postgres connection string).

Example values:

```bash
# .env
DATABASE_URL=postgres://user:password@host:5432/dbname
PORT=5000
```

---

## Server

- Serves the SPA from `public/` and exposes REST endpoints under `/api/employees`.
- On boot, it ensures the table and uniqueness index exist.
- Listens on `PORT` or defaults to `5000`.

Endpoints:

```http
GET    /api/employees
POST   /api/employees
PUT    /api/employees/:id
DELETE /api/employees/:id
```

Response/Request model:

```json
{
  "id": "string",
  "firstName": "string",
  "lastName": "string",
  "email": "string",
  "department": "string",
  "salary": 50000
}
```

Notes:

- `GET` returns employees ordered by lastName, then firstName.
- `POST` and `PUT` validate required fields and salary type; duplicate emails return `409`.

Example cURL:

```bash
curl http://localhost:5000/api/employees

curl -X POST http://localhost:5000/api/employees \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Jane","lastName":"Doe","email":"jane@company.com","department":"CSE","salary":80000}'

curl -X PUT http://localhost:5000/api/employees/<id> \
  -H 'Content-Type: application/json' \
  -d '{"firstName":"Jane","lastName":"Doe","email":"jane@company.com","department":"EEE","salary":90000}'

curl -X DELETE http://localhost:5000/api/employees/<id>
```

---

## Frontend Features

- **Add/Edit/Delete**: Form submits to the API; edit uses a modal; delete confirms.
- **Search**: Instant, case‑insensitive search across name, email, department.
- **Filter**: Department dropdown with an "All departments" option.
- **Sorting**: Click table headers to sort by Name, Email, Department, or Salary; toggles asc/desc.
- **Pagination**: Client‑side pagination with selectable rows per page (5/10/25/50).
- **CSV Export**: Generates a CSV entirely on the client using `Blob` and triggers a download.
- **Excel Export**: Uses `ExcelJS` (loaded via CDN) to generate `.xlsx` with headers, widths, and currency formatting for salary.
- **Toasts**: Lightweight notifications for success/error states.

Sorting specifics (client‑side):

- Name sort uses a concatenation of `firstName lastName` (case‑insensitive).
- Text fields compare using lowercase strings.
- Salary is compared numerically.

Pagination specifics (client‑side):

- Computed from the filtered list; page bounds protected.
- Displays total results and current page info; disables prev/next at bounds.

---

## CSV Export Details

- Columns: Name, Email, Department, Salary (₹).
- Implementation builds rows from the current filtered dataset and downloads `employees.csv`.
- Commas/quotes in fields are handled by wrapping fields in quotes.

---

## Excel Export Details

- Uses `ExcelJS` via CDN in `index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js"></script>
```

- Workbook/worksheet are created in the browser; headers are bold; salary column uses Indian Rupee currency format `[$₹-4009]#,##0`.
- Downloads `employees.xlsx` without any server roundtrip.

---

## Getting Started (Local)

1) Install dependencies

```bash
npm install
```

2) Configure environment

```bash
cp .env.example .env
# edit .env to set DATABASE_URL
```

3) Run the server (default http://localhost:5000)

```bash
npm run dev
# or
npm start
```

Open `http://localhost:5000` in your browser.

---

## Deployment

- Any platform with Node + Postgres support works (e.g., Railway, Render, Fly.io, Heroku‑like).
- Ensure `DATABASE_URL` is set in the platform environment.
- Bind to `0.0.0.0` and the platform-provided port (already handled by `server.js`).

---

## Validation and Error Handling

- Backend validates required fields and returns `400` for invalid payloads.
- Unique email conflicts return `409` with a descriptive message.
- Generic server/database errors return `500`.
- Frontend surfaces errors via toast notifications.

---

## FAQs / Troubleshooting

- "Server exits on start with DATABASE_URL error": set `DATABASE_URL` in `.env` or platform env.
- "Duplicate email" on add/update: the database enforces a case‑insensitive uniqueness index.
- "Excel export fails": verify network access to the ExcelJS CDN and that `filteredEmployees` has data.
- "Nothing shows in the table": check the Network tab for `/api/employees` errors; verify database connectivity and table exists (it’s auto‑created on boot).

---

## License

MIT

