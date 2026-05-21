# Made Products — Client Statement Tracker

> ERP-lite financial ledger for manufacturing businesses. Track clients, invoices, payments, and collections with role-based access control.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Database ORM | Prisma 7 + Supabase PostgreSQL |
| Auth | Supabase Auth (`@supabase/ssr`) |
| File Storage | Supabase Storage |
| Language | TypeScript |
| Styling | Vanilla CSS Modules |
| Charts | Recharts |
| Forms | React Hook Form + Zod |

---

## Features

- **Dashboard** — Live metrics: total revenue, pending balance, overdue invoices, top clients, monthly revenue chart, recent payments timeline
- **Client Directory** — Search, sort, add/edit/delete client profiles with GSTIN validation
- **Client Profiles** — Full billing history, invoice statements, payment log, file attachments
- **Invoice Statements** — Create invoices, track partial/full payments, overdue auto-detection
- **Payment Recording** — Bank transfer, UPI, cheque, cash — with transaction number & receipt uploads
- **WhatsApp Reminders** — Pre-filled reminder messages sent directly via WhatsApp Web
- **File Uploads** — Attach invoice PDFs and payment receipts via Supabase Storage
- **Role-based Access** — Admin (full CRUD) vs Staff (read + create only)
- **Dark Mode** — Automatic via `prefers-color-scheme`
- **Responsive Design** — Mobile-friendly layout with slide-in sidebar

---

## Quick Start

### 1. Prerequisites

- Node.js 18+
- A free [Supabase](https://supabase.com) account

### 2. Clone & Install

```bash
git clone <your-repo>
cd made-products-client-statement-tracker
npm install
```

### 3. Configure Environment Variables

Copy the template and fill in your Supabase credentials:

```bash
copy .env.example .env
```

Open `.env` and replace the placeholders:

- **`NEXT_PUBLIC_SUPABASE_URL`** → Supabase Dashboard → Project Settings → API → Project URL
- **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** → Supabase Dashboard → Project Settings → API → `anon` `public` key
- **`DATABASE_URL`** → Supabase Dashboard → Project Settings → Database → Connection pooling → Transaction mode (port **6543**)
- **`DIRECT_URL`** → Supabase Dashboard → Project Settings → Database → Direct connection (port **5432**)

### 4. Initialize Database

```bash
# Push schema to Supabase (creates all tables)
npx prisma db push

# Seed with demo clients, statements, and payments
npx prisma db seed
```

### 5. Create Storage Buckets

In your Supabase dashboard → Storage, create two **public** buckets:
- `invoices`
- `receipts`

### 6. Run the App

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

### 7. Create Your First User

1. Go to `/signup` and create an account
2. The first registered user automatically gets **Admin** role
3. Subsequent signups default to **Staff** (can be changed in the select on signup)

> **Note:** Supabase may require email confirmation. To disable this for development, go to Supabase → Authentication → Providers → Email → disable "Confirm email".

---

## Project Structure

```
src/
├── app/
│   ├── (authenticated)/         # Protected route group
│   │   ├── layout.tsx           # Session guard + sidebar shell
│   │   ├── dashboard/           # Main dashboard with charts
│   │   ├── clients/             # Client directory + [id] profile
│   │   └── statements/          # All invoices table
│   ├── actions/                 # Server Actions (auth, clients, statements, payments)
│   ├── login/                   # Login page
│   └── signup/                  # Registration page
├── components/
│   ├── layout/Sidebar.tsx       # Responsive navigation sidebar
│   ├── clients/                 # ClientListContainer, ClientProfileContainer
│   ├── statements/              # StatementsContainer
│   ├── dashboard/Charts.tsx     # Recharts area + pie charts
│   └── ui/                     # Modal, Toast, FileUpload
└── lib/
    ├── db.ts                    # Prisma singleton
    ├── auth.ts                  # getCurrentUser helper
    ├── utils.ts                 # formatCurrency, formatDate, getStatementStatus
    └── supabase/                # Supabase client/server/middleware helpers
```

---

## Role Permissions

| Action | Admin | Staff |
|---|---|---|
| View dashboard, clients, statements | ✅ | ✅ |
| Add new client | ✅ | ✅ |
| Edit client profile | ✅ | ✅ |
| **Delete client** | ✅ | ❌ |
| Create invoice statement | ✅ | ✅ |
| Record payment | ✅ | ✅ |
| **Delete statement** | ✅ | ❌ |
| **Delete payment record** | ✅ | ❌ |

---

## Payment Status Logic

Statuses are calculated automatically on every payment mutation:

| Status | Condition |
|---|---|
| `PAID` | `balanceAmount ≤ 0` |
| `OVERDUE` | `balanceAmount > 0` AND `dueDate < today` |
| `PARTIAL` | `balanceAmount > 0` AND `paidAmount > 0` AND not overdue |
| `PENDING` | `paidAmount = 0` AND not overdue |
