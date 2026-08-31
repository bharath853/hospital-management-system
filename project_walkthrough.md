# 🏥 Hospital Management System — Tech Stack & Project Walkthrough

---

## 🧱 Tech Stack Overview

### 🔵 Backend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | FastAPI | ≥ 0.100.0 | REST API server, auto OpenAPI docs |
| **Server** | Uvicorn | ≥ 0.20.0 | ASGI server to run FastAPI |
| **ORM** | SQLAlchemy | ≥ 2.0.0 | Database models & queries |
| **Database** | SQLite (via hms.db) | — | Local file-based database |
| **Validation** | Pydantic | ≥ 2.0.0 | Request/response schema validation |
| **Auth** | PyJWT | ≥ 2.8.0 | JWT token creation & decoding |
| **Password** | PBKDF2-SHA256 | (stdlib) | Secure password hashing |
| **Config** | python-dotenv | ≥ 1.0.0 | `.env` file loading |
| **Migrations** | Alembic | — | DB schema migrations |
| **Language** | Python 3.14 | — | Core backend language |

### 🟢 Frontend

| Layer | Technology | Version | Purpose |
|-------|-----------|---------|---------|
| **Framework** | React | 18.3.1 | UI component framework |
| **Build Tool** | Vite | 5.4.x | Fast dev server & bundler |
| **Routing** | React Router DOM | 7.18.x | SPA client-side routing |
| **HTTP Client** | Axios | 1.19.x | API calls to FastAPI backend |
| **Charts** | Recharts | 2.9.x | Dashboard analytics charts |
| **Icons** | Lucide React | 0.468.x | Icon library (shieldcheck, pill, etc.) |
| **CSS** | Tailwind CSS | 3.4.x | Utility-first styling |
| **PostCSS** | Autoprefixer | 10.4.x | CSS vendor prefix support |
| **Language** | JavaScript (JSX) | ES Module | UI logic |

---

## 🗂️ Full Project Structure

```
Hospital_app/
├── 📄 .env                        ← Environment variables (secret key, DB URL)
├── 📄 .env.example                ← Template for .env setup
├── 📄 requirements.txt            ← Python dependencies
├── 📄 package.json                ← Root-level Node config
├── 📄 hms.db                      ← SQLite database file (auto-created)
├── 📄 README.md                   ← Project documentation
│
├── 📁 hms_backend/                ← 🐍 Python FastAPI Backend
│   └── 📁 app/
│       ├── main.py                ← App entry point + startup + CORS
│       ├── 📁 core/               ← Core infrastructure
│       │   ├── config.py          ← Settings (SECRET_KEY, DB_URL, JWT config)
│       │   ├── database.py        ← SQLAlchemy engine + session + Base
│       │   ├── security.py        ← Password hash + JWT create/decode
│       │   └── seeder.py          ← Auto seeds DB with demo data on startup
│       ├── 📁 models/             ← SQLAlchemy database table models
│       │   ├── user.py
│       │   ├── patient.py
│       │   ├── doctor.py, staff.py, department.py
│       │   ├── appointment.py, opd.py, ipd.py
│       │   ├── lab.py, pharmacy.py, billing.py
│       │   ├── prescription.py, ambulance.py
│       │   ├── audit.py, generic.py
│       ├── 📁 schemas/            ← Pydantic input/output models
│       │   ├── user.py, patient.py, doctor.py ...
│       ├── 📁 api/v1/             ← REST API route handlers (v1)
│       │   ├── router.py          ← Aggregates all routers under /api/v1
│       │   ├── auth.py            ← POST /auth/login → returns JWT token
│       │   ├── admin.py           ← Admin-only endpoints
│       │   ├── patients.py, doctors.py, appointments.py
│       │   ├── opd.py, ipd.py, nursing.py
│       │   ├── laboratory.py, pharmacy.py, billing.py
│       │   ├── reception.py, portal.py, ambulance.py, reports.py
│       ├── 📁 routers/            ← Legacy direct routers (also registered)
│       │   ├── admin.py, doctor.py, nurse.py
│       │   ├── reception.py, laboratory.py
│       │   ├── pharmacy.py, inpatient.py
│       │   ├── billing.py, portal.py
│       ├── 📁 dependencies/
│       │   └── auth.py            ← get_current_user() + require_role()
│       ├── 📁 services/           ← Business logic layer
│       │   ├── billing_service.py
│       │   ├── ipd_service.py
│       │   └── pharmacy_service.py
│       └── 📁 utils/              ← Utility helpers
│           ├── generic_crud.py    ← Reusable CRUD operations
│           ├── audit.py           ← Audit trail logging
│           ├── pdf.py             ← PDF generation helper
│           └── notifications.py  ← Notification utilities
│
├── 📁 hms-frontend/               ← ⚛️ React + Vite Frontend
│   ├── 📄 package.json
│   ├── 📄 vite.config.js          ← Vite configuration + proxy to :8000
│   └── 📁 src/
│       ├── main.jsx               ← React DOM entry point
│       ├── App.jsx                ← Main app + all routes (1200+ lines)
│       ├── index.css              ← Global styles + Tailwind directives
│       ├── 📁 components/Layout/
│       │   ├── Layout.jsx         ← App shell (sidebar + header + content)
│       │   ├── Sidebar.jsx        ← Role-filtered navigation sidebar
│       │   └── Header.jsx         ← Top bar with user info + logout
│       └── 📁 pages/
│           ├── 📁 Auth/
│           │   └── Login.jsx      ← Redesigned login page (NEW)
│           └── 📁 Admin/
│               └── Dashboard.jsx  ← Admin analytics dashboard
│
├── 📁 alembic/
│   └── env.py                     ← Alembic migration environment
│
└── 📁 tests/                      ← 🧪 Test Suite (9 files)
    ├── test_unit.py
    ├── test_integration.py
    ├── test_e2e.py
    ├── test_functional.py
    ├── test_security.py
    ├── test_performance.py
    ├── test_regression.py
    ├── test_compatibility.py
    └── test_database_persistence_and_deletion.py
```

---

## 🔄 How the App Works — End-to-End Flow

```
Browser (React @ :5173)
       │
       │  1. User visits /login
       ▼
  Login.jsx  ─── POST /api/v1/auth/login ──►  FastAPI @ :8000
                      { username, password }
                                              │
                                              │  2. Lookup user in SQLite DB
                                              │  3. Verify PBKDF2 password hash
                                              │  4. Generate JWT (HS256)
                                              ▼
                      ◄── { access_token, role, name } ───
       │
       │  5. Store token + role in localStorage
       │  6. Redirect to /admin/dashboard (or role-based route)
       │
       ▼
  App.jsx (React Router)
       │
       │  7. Sidebar shows modules filtered by role
       │  8. Each page sends requests with Authorization: Bearer <token>
       │
       ▼
  FastAPI Endpoint (e.g. GET /api/v1/patients)
       │
       │  9. get_current_user() reads JWT → gets user from DB
       │  10. require_role("admin") checks access level
       │  11. SQLAlchemy queries hms.db
       │  12. Pydantic validates and serializes response
       ▼
  React Page renders the data
```

---

## 🔐 Authentication & Role System

### How Auth Works
1. Frontend sends `{ username, password }` to `POST /api/v1/auth/login`
2. Backend hashes password with **PBKDF2-SHA256** and compares
3. On success, returns a **JWT (HS256)** with `sub` (email) and `role` claims
4. Frontend stores the token in `localStorage` as `hms_token`
5. All subsequent API calls send `Authorization: Bearer <token>` header
6. Backend's `get_current_user()` dependency decodes JWT and loads the user
7. `require_role("nurse")` enforces role-based access control

### User Roles & Sidebar Access

| Role | Modules Visible |
|------|----------------|
| **admin** | ALL modules (full access) |
| **doctor** | Doctor only |
| **nurse** | Nurse only |
| **reception** | Reception + Billing |
| **laboratory** | Laboratory only |
| **pharmacy** | Pharmacy only |

---

## 📦 9 Hospital Modules (Sidebar)

| # | Module | Icon | Sub-Pages |
|---|--------|------|-----------|
| 1 | **Admin** | 🛡️ ShieldCheck | Dashboard, Users, Doctors, Departments, Staff, Reports, Settings, Deleted Records |
| 2 | **Reception** | 👤 UserPlus | Patient Registration, Appointment Booking, Queue Management, OP/IP Registration |
| 3 | **Doctor** | 🩺 Stethoscope | View Appointments, Patient History, Diagnosis, Prescription, Lab Requests, Follow-ups |
| 4 | **Nurse** | 💓 HeartPulse | Patient Vitals *(Pain Scale, RBS, SpO2)*, Ward Management, Medication Admin, Nursing Notes |
| 5 | **Laboratory** | 🧪 FlaskConical | Test Request, Sample Collection, Report Entry, Report Upload |
| 6 | **Pharmacy** | 💊 Pill | Medicine Inventory, Prescription Processing, Medicine Billing, Stock Alerts |
| 7 | **Inpatient (IP)** | 🛏️ BedDouble | Room Allocation, Admission, Treatment Records, Daily Progress, Discharge Summary |
| 8 | **Billing** | 🧾 Receipt | Consultation/Lab/Pharmacy/Room Charges, Payment Gateway, Invoice Generation |
| 9 | **Patient Portal** | 📱 MonitorSmartphone | Login, Book Appointment, View Prescriptions, Download Lab Reports, Online Payment, Medical History |

---

## 🗄️ Database Design (SQLite → SQLAlchemy Models)

```
users ────────────────── departments
  ↓ role                    ↑ department_id
patients                  doctors
  ↓ patient_id               ↓ doctor_id
appointments ─── doctor_id ──┘
  ↓
opd_visits
ipd_admissions ── bed_id ── beds ── ward_id ── wards
prescriptions
test_requests ── lab_reports
medicines ── stock_transactions
invoices ── payments
ambulances ── emergency_bookings
audit_logs
```

---

## 🌐 API Routes Map (`/api/v1/`)

| Prefix | Module | Key Endpoints |
|--------|--------|---------------|
| `/auth` | Auth | `POST /login` |
| `/admin` | Admin | Users, departments, stats |
| `/patients` | Patients | CRUD patients |
| `/doctors` | Doctors | CRUD doctors |
| `/appointments` | Appointments | Book, list, update |
| `/reception` | Reception | Queue, registration |
| `/doctor` | Doctor Panel | Appointments, prescriptions |
| `/opd` | OPD | Token queue management |
| `/ipd` | IPD | Wards, beds, admissions |
| `/nursing` | Nursing | Vitals (Pain Scale, RBS, SpO2) |
| `/laboratory` | Lab | Test requests, reports |
| `/pharmacy` | Pharmacy | Medicines, stock, billing |
| `/billing` | Billing | Invoices, payments |
| `/ambulance` | Ambulance | Fleet, emergency bookings |
| `/reports` | Reports | Analytics data |
| `/portal` | Patient Portal | Self-service portal |

---

## 🧪 Test Coverage

| Test Type | File | Focus |
|-----------|------|-------|
| Unit | `test_unit.py` | Individual function tests |
| Integration | `test_integration.py` | API + DB interaction |
| End-to-End | `test_e2e.py` | Full user workflows |
| Functional | `test_functional.py` | Feature-level behavior |
| Security | `test_security.py` | Auth, JWT, RBAC |
| Performance | `test_performance.py` | Response times |
| Regression | `test_regression.py` | No regressions |
| Compatibility | `test_compatibility.py` | Env compatibility |
| DB Persistence | `test_database_persistence_and_deletion.py` | CRUD data integrity |

---

## 🚀 Running the App

```bash
# Backend
pip install -r requirements.txt
python -m uvicorn hms_backend.app.main:app --reload --port 8000

# Frontend (separate terminal)
cd hms-frontend
npm install
npm run dev
```

| Service | URL |
|---------|-----|
| Frontend | http://localhost:5173 |
| Backend API | http://localhost:8000 |
| API Docs (Swagger) | http://localhost:8000/docs |
| ReDoc | http://localhost:8000/redoc |
