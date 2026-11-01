# Nexora Clinic

Nexora Clinic runs the day-to-day work of an outpatient clinic: the front desk, the consulting rooms and billing, in one web app.

- **Today:** who is booked, who is in the waiting room, unpaid invoices, and a 7-day chart of visits.
- **Schedule:** one column per doctor. Reception books appointments (double-booking is refused), checks patients in, and marks no-shows or cancellations.
- **Patients:** search by name, MRN or phone, register new patients, and see allergies flagged everywhere a patient appears.
- **Patient chart:** contact and insurance details, upcoming appointments, and full visit history with vitals, diagnosis and prescriptions.
- **Recording a visit:** the doctor calls the patient in, records vitals, diagnosis, notes and prescriptions, and completes the visit. This also drafts an invoice.
- **Billing:** reception reviews draft invoices, edits the lines, issues them and marks them paid.
- **Staff and access log (admin):** add or deactivate accounts, and see every sign-in, chart view and change.

## Roles

| | Reception | Doctor | Admin |
| --- | --- | --- | --- |
| Book, check in, cancel | ✓ | | ✓ |
| Register and edit patients | ✓ | | ✓ |
| Clinical notes and prescriptions | | ✓ (own patients) | read |
| Billing | ✓ | | ✓ |
| Staff and access log | | | ✓ |

The API checks the role on every request; hiding a menu item is never the only protection. Reception never receives clinical notes from the server at all.

## How it's built

| Folder | What it is |
| --- | --- |
| `apps/api` | Express 5 + TypeScript. PostgreSQL via Prisma for patients, appointments, visits and invoices. MongoDB for the access log (expires after two years). Email/password sign-in with scrypt hashes and an httpOnly JWT cookie. |
| `apps/web` | React 19 + Vite + Tailwind, light and dark mode. |

## Running it locally

You need Node 24 and PostgreSQL 16 binaries installed (`sudo apt install postgresql-16`). MongoDB is downloaded automatically the first time.

```bash
npm install
cp apps/api/.env.example apps/api/.env   # then set JWT_SECRET to a long random string
npm run dev:services                      # Postgres on :5434, MongoDB on :27018
npm run db:migrate
npm run db:seed                           # demo clinic with three weeks of data
npm run dev                               # API on :4100, web on http://localhost:5190
```

`npm run server` and `npm run client` start the API and web app separately. `npm run stop:services` stops the databases.

### Demo accounts

All use the password `clinic-demo-2026`. The sign-in page has buttons that fill them in.

| Email | Role |
| --- | --- |
| reception@nexora.clinic | Reception |
| dr.haddad@nexora.clinic | Doctor (General Practice) |
| dr.novak@nexora.clinic | Doctor (Pediatrics) |
| dr.mensah@nexora.clinic | Doctor (Internal Medicine) |
| admin@nexora.clinic | Administrator |

A good tour: sign in as **reception**, check a patient in on the Today page, then sign in as that patient's **doctor**, record the visit, and go back to reception's **Billing** page to issue the invoice.

## Checks

```bash
npm run lint
npm run typecheck
npm run build
```
