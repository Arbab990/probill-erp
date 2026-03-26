 #  <img src="https://raw.githubusercontent.com/lucide-icons/lucide/main/icons/zap.svg" width="24" height="24" /> ProBill ERP 

**<img src="https://sap.github.io/ui5-webcomponents/assets/images/icons/sap-icons/business-suite.svg" width="32" vertical-align="middle" />SAP S/4 HANA-Inspired Professional Billing & Financial Management Software**
MERN Stack · Tailwind CSS · Google Gemini AI · 100% Free Tier

---

## What Is ProBill ERP?

ProBill ERP is a full-stack, enterprise-grade business application built on the MERN stack, inspired by SAP S/4 HANA workflows. It covers the complete financial and procurement lifecycle of a business — from vendor management and purchase requisitions all the way through invoicing, payment runs, general ledger accounting, and AI-powered financial summaries.

The project is split into a React client and a Node.js/Express server, with MongoDB as the database and Google Gemini as the AI backbone.

---

## Tech Stack

### Frontend (`client/`)
| Package | Purpose |
|---|---|
| React 18 + Vite 4 | UI framework and build tool |
| Tailwind CSS 3.3 | Utility-first styling |
| React Router 6 | Client-side routing |
| Zustand 4 | Lightweight state management |
| Axios 1.6 | HTTP client with interceptors |
| Recharts 2.8 | Dashboard charts |
| React Hook Form 7 | Form handling and validation |
| @tanstack/react-table 8 | Headless data tables |
| lucide-react | Icon library |
| jsPDF + html2canvas | Client-side PDF export |
| date-fns | Date formatting and manipulation |
| react-hot-toast | Toast notifications |

### Backend (`server/`)
| Package | Purpose |
|---|---|
| Express 4.18 | Web framework |
| Mongoose 8 | MongoDB ODM with schema validation |
| jsonwebtoken | Stateless JWT authentication |
| bcryptjs | Password hashing |
| helmet + cors | Security middleware |
| express-rate-limit | API abuse prevention |
| nodemailer | Invoice email delivery |
| pdfkit | Server-side PDF generation |
| @google/generative-ai | Gemini AI SDK |
| node-cron | Recurring invoice and overdue reminders |
| multer | File/document uploads |
| express-validator | Request body validation |
| morgan | HTTP request logging |

### External Services (All Free Tier)
| Service | Purpose | Free Limit |
|---|---|---|
| MongoDB Atlas | Database hosting | M0 Sandbox — 512 MB |
| Google Gemini API | AI features | 15 RPM, 1M tokens/day |
| Gmail SMTP | Email sending | 500 emails/day |
| Render.com | Backend deploy | 750 hrs/month |
| Vercel | Frontend deploy | Unlimited (hobby) |

---

## Functional Modules

| Module | Description |
|---|---|
| **Authentication** | Register, login, logout, JWT, profile, password update, forgot/reset password |
| **Dashboard** | KPI cards, revenue trend chart, invoice status breakdown, AI financial summary |
| **Vendors** | Full CRUD, status management (pending → verified → blacklisted), AI risk scoring |
| **Billing** | Sales and purchase invoices, payment recording, PDF generation, email sending |
| **Purchasing (P2P)** | Purchase requisitions, purchase orders, goods receipt notes, 3-way match |
| **Orders (O2C)** | Customers, sales orders, delivery notes, invoice generation, AR aging |
| **Payments** | Pending invoice selection, SAP-style payment proposal, approval, execution, CSV bank export |
| **General Ledger (R2R)** | Chart of accounts, journal entries, posting, reversal, trial balance, P&L, balance sheet |
| **Fiscal Periods** | Lock/unlock accounting periods to prevent backdated journal entries |
| **Analytics** | Cash flow, KPI trends, vendor/customer analytics, Excel export, AI summaries |
| **AI Features** | 7 Gemini-powered features across the application |
| **Settings / Admin** | Company profile, user management, role changes, tax config, audit logs |
| **Notifications** | Inbox, unread badge, mark read, overdue checks via cron |

---

## Roles & Permissions

The application defines six roles with enforced RBAC on both backend routes and frontend components:

| Role | Access Level |
|---|---|
| `super_admin` | Full access to all modules, user management, and company settings |
| `finance_manager` | Billing, payments, R2R, reports — no vendor write or admin panel |
| `procurement_officer` | Vendors, full P2P cycle, purchase orders |
| `sales_executive` | Customers, sales orders, order-to-cash, billing write |
| `auditor` | Read-only across all modules except admin panel |
| `viewer` | Dashboard only — no write access anywhere |

RBAC is enforced via:
- `authMiddleware.js` — verifies JWT, attaches `req.user`
- `rbacMiddleware.js` — `authorize(...roles)` on every sensitive route
- `ProtectedRoute.jsx` — redirects unauthenticated users to `/login`
- `RoleGuard.jsx` — hides UI components based on role
- `usePermission.js` hook — `can("vendors", "write")` checks in components

---

## AI Features (Google Gemini)

All AI calls are routed through `server/services/geminiService.js` using `gemini-1.5-flash`.

| Feature | Trigger | Output |
|---|---|---|
| Financial Health Summary | Dashboard load | 2–3 sentence plain-English KPI summary |
| Vendor Risk Scoring | Vendor detail view | Score 0–100 + reason + recommendation |
| Late Payer Prediction | AR Tracker page | Likelihood (high/medium/low) per customer |
| Payment Timing Optimization | Creating a payment run | Recommended pay-now vs defer schedule |
| Journal Anomaly Detection | Finance manager views journal list | Flagged entries with reasons |
| Invoice Description Drafting | AI Assist button on invoice line item | Professional description under 15 words |
| Natural Language Report Query | NLQueryReport page | MongoDB filter object from plain English |

---

## Architecture Notes

### Frontend

The client is a protected single-page app. All routes are defined in `client/src/App.jsx`, with authenticated pages wrapped by `ProtectedRoute` and rendered inside a shared `Layout` with sidebar and topbar.

API access is centralized through `client/src/services/api.js`. The Axios instance:
- Uses `VITE_API_URL` when provided, defaults to `http://localhost:5000/api`
- Injects the JWT from persisted Zustand auth state on every request
- Redirects to `/login` on `401` responses

Auth state is persisted in `localStorage` under the key `probill-auth`.

### Backend

The server bootstraps from `server/server.js` and exposes all REST endpoints under `/api`. Core middleware stack:
- `helmet` — security headers
- `cors` — configured for `CLIENT_URL`
- JSON body parsing
- `morgan` request logging (development only)
- API-wide and auth-specific rate limiting
- Centralized error handling via `errorMiddleware.js`

### Data Model

All records are scoped to a `Company`. Auto-generated identifiers follow these patterns:
- Vendors: `VND-0001`
- Invoices: `INV-2026-00001`
- Purchase Requisitions: `PR-2026-00001`
- Purchase Orders: `PO-2026-00001`
- Goods Receipts: `GRN-2026-00001`
- Payment Runs: `PAY-BATCH-2026-001`
- Journal Entries: `JE-2026-00001`

---

## Business Flows

### P2P — Procure to Pay
```
PR (draft) → PR submitted → PR approved → PO created → PO sent to vendor
→ Goods received (GRN) → 3-Way Match (PO + GRN + Invoice)
→ Payment Run → Bank CSV export → Invoice marked paid
```

### O2C — Order to Cash
```
Customer created → Sales Order → SO confirmed → shipped → delivered
→ Invoice generated from SO → PDF emailed to customer
→ Payment recorded → Invoice marked paid
(Overdue: cron sends dunning email → latePaymentCount incremented)
```

### Payment Run Flow
```
Select unpaid invoices → Create batch (draft)
→ AI recommends execution date → Approved by Finance Manager / Super Admin
→ Export as bank CSV → Mark executed → All linked invoices auto-updated to paid
```

### R2R — Record to Report
```
Financial transactions → Journal Entry created (must balance: Σ DR = Σ CR)
→ Posted by Finance Manager → Account balances updated
→ Trial Balance / P&L / Balance Sheet generated
→ AI anomaly scan → Period close (locks period from further entries)
```

---

## Repository Structure

```
probill-erp/
├── client/                     # React + Vite frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── common/         # Button, Input, Modal, Table, Badge, Card, etc.
│   │   │   ├── layout/         # Sidebar, Topbar, Layout, PageHeader
│   │   │   ├── charts/         # RevenueChart, InvoiceStatusChart, CashFlowChart, AgingChart
│   │   │   └── ai/             # AIAssistant (floating), AIInsightCard
│   │   ├── pages/
│   │   │   ├── Auth/           # Login, Register, ForgotPassword
│   │   │   ├── Dashboard/
│   │   │   ├── Vendors/        # VendorList, VendorForm, VendorDetail
│   │   │   ├── Purchase/       # PurchaseRequisition, PurchaseOrders, GoodsReceipt, ThreeWayMatch
│   │   │   ├── Orders/         # Customers, SalesOrders, DeliveryNotes, ARTracker
│   │   │   ├── Finance/        # JournalEntries, ChartOfAccounts, TrialBalance, PeriodClose
│   │   │   ├── Billing/        # InvoiceList, InvoiceCreate, InvoiceDetail, RecurringInvoices
│   │   │   ├── Payments/       # PaymentRuns, PaymentBatch, PaymentCalendar
│   │   │   ├── Reports/        # Reports, ARAgingReport, APAgingReport, NLQueryReport
│   │   │   └── Admin/          # UserManagement, CompanySettings, TaxConfig, AuditLogs
│   │   ├── store/              # Zustand: authStore, vendorStore, invoiceStore, paymentStore, notificationStore
│   │   ├── services/           # Axios service modules per domain
│   │   ├── hooks/              # useAuth, usePermission, useDebounce
│   │   ├── guards/             # ProtectedRoute, RoleGuard
│   │   └── utils/              # constants, formatters, validators, pdfExport
│   ├── .env
│   ├── tailwind.config.js
│   └── vite.config.js
│
└── server/                     # Express + MongoDB backend
    ├── controllers/            # authController, vendorController, invoiceController, etc.
    ├── models/                 # 15 Mongoose models
    ├── routes/                 # Route files per domain
    ├── middleware/             # authMiddleware, rbacMiddleware, auditMiddleware, errorMiddleware, rateLimiter
    ├── services/               # geminiService, emailService, pdfService, notificationService
    ├── utils/                  # generateInvoiceNo, generatePONumber, threeWayMatch, agingCalculator
    ├── config/                 # db.js — MongoDB connection
    ├── seeds/                  # seedUsers, seedVendors, seedInvoices
    ├── .env
    └── server.js
```

---

## API Endpoints

All endpoints are served under `/api`.

| Group | Base Path | Key Operations |
|---|---|---|
| Auth | `/api/auth` | register, login, logout, me, forgot-password, reset-password |
| Vendors | `/api/vendors` | CRUD, status update, AI risk score |
| Invoices | `/api/invoices` | CRUD, send PDF email, download PDF, record payment, status update |
| Purchase (P2P) | `/api/purchase` | Requisitions CRUD + approve/reject, Orders CRUD + approve/send, GRN CRUD + confirm, 3-way match |
| Orders (O2C) | `/api/orders` | Customers CRUD, Sales Orders CRUD + status + generate invoice, Delivery Notes, AR aging |
| Payments | `/api/payments` | Payment runs CRUD, approve, execute, export CSV, payment history |
| Finance (R2R) | `/api/finance` | Journal entries CRUD + post + reverse, Chart of Accounts CRUD, trial balance, P&L, balance sheet |
| Reports | `/api/reports` | Dashboard KPIs, AR/AP aging |
| AI | `/api/ai` | financial-summary, vendor-risk, predict-late-payers, payment-timing, journal-anomaly, invoice-description, nl-query |
| Admin | `/api/admin` | User management, role changes, audit logs, company settings, tax config |
| Fiscal Periods | `/api/fiscal-periods` | List periods, lock, unlock |
| Notifications | `/api/notifications` | Inbox, unread count, mark read, clear |
| Search | `/api/search` | Global search |
| Health | `/api/health` | Server health check |

---

## Local Development

### Prerequisites
- Node.js v20 LTS
- MongoDB Atlas account (free M0 tier) or local MongoDB

### 1. Clone and install dependencies

```bash
# Backend
cd server
npm install
npm install node-cron  # required for recurring invoices and overdue cron

# Frontend
cd ../client
npm install
```

### 2. Configure environment variables

Create `server/.env`:
```env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://<user>:<pass>@cluster0.xxxxx.mongodb.net/probill
JWT_SECRET=your_jwt_secret_at_least_32_characters
JWT_EXPIRE=7d
CLIENT_URL=http://localhost:5173

# Optional — required for AI features
GEMINI_API_KEY=AIzaSy...

# Optional — falls back to Ethereal test email in development
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your@gmail.com
EMAIL_PASS=your_gmail_app_password
```

Create `client/.env`:
```env
VITE_API_URL=http://localhost:5000/api
```

### 3. Start the servers

```bash
# Backend (from /server)
npm run dev

# Frontend (from /client)
npm run dev
```

### 4. Open the app

| Service | URL |
|---|---|
| Frontend | http://localhost:5173 |
| Backend | http://localhost:5000 |
| Health check | http://localhost:5000/api/health |

### First-time setup
Register the first user with a `companyName` to auto-create the company and assign the `super_admin` role.

---

## UI Design System

| Token | Value | Usage |
|---|---|---|
| `--primary` | `#6366F1` | Indigo — primary actions |
| `--primary-dark` | `#4F46E5` | Hover states |
| `--secondary` | `#0EA5E9` | Sky blue — secondary elements |
| `--success` | `#10B981` | Emerald — positive states |
| `--warning` | `#F59E0B` | Amber — alerts |
| `--danger` | `#EF4444` | Red — destructive actions |
| `--bg-dark` | `#0F172A` | Slate 900 — main background |
| `--bg-card` | `#1E293B` | Slate 800 — card/panel background |
| `--text-primary` | `#F1F5F9` | Slate 100 |
| `--text-muted` | `#94A3B8` | Slate 400 |
| `--border` | `#334155` | Slate 700 |

**Fonts:** Syne (headings) · DM Sans (body/UI) · JetBrains Mono (code/monospace)

---

## Rate Limiting

| Scope | Limit |
|---|---|
| General API | 1000 requests / 15 minutes |
| Auth routes | 50 requests / 15 minutes |

---

## Deployment

| Layer | Platform | Notes |
|---|---|---|
| Backend | Render.com | Free hobby tier — set all `.env` vars in dashboard |
| Frontend | Vercel | Connect GitHub repo — set `VITE_API_URL` to Render URL |

---

## Suggested Improvements

- Add a root-level `package.json` with workspace scripts to start both apps together (`npm run dev`)
- Add `.env.example` files for both client and server
- Remove committed `node_modules` from version control — add to `.gitignore`
-  After cloning, run `cd server && npm install node-cron` — required for recurring invoice and overdue cron jobs
- Add automated tests for controllers, services, and critical UI flows
- Add an OpenAPI/Swagger spec for the API surface
- Add seed scripts for demo chart of accounts and initial data
-  Mongoose transactions (payment run execution) require MongoDB Atlas or a replica set — standalone local MongoDB will throw an error on execute
- Fiscal periods are auto-generated for the last 13 months on first visit to GL → Fiscal Periods

---

## Notes

- `MONGODB_URI` and `JWT_SECRET` are required for the server to start
- If SMTP settings are omitted, the app falls back to Ethereal test email in development
- If `GEMINI_API_KEY` is missing, all AI-powered features will silently fail
- The Gmail app password is a 16-character code generated under Google Account → Security → 2-Step Verification → App Passwords
