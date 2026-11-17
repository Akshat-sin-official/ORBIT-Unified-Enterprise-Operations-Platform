# ORBIT — Unified Enterprise Operations Platform

Enterprise Resource Operations Management Platform coordinating Customer Management, Service Desk, Field Technicians, Inventory & Warehouses, Logistics Fleet, Invoicing, and Operational Analytics.

## Architecture & Technology Stack

- **Architecture:** Domain-Driven Modular Monolith
- **Monorepo:** pnpm workspaces + Turborepo
- **Backend:** NestJS 10, Prisma ORM 5, PostgreSQL 16, Redis 7
- **Frontend:** React 18, TypeScript, Tailwind CSS 3, Vite 6, Radix UI, TanStack Query
- **Design System:** Warm Alabaster (`#FAF9F6`), Deep Ink (`#18181B`), Electric Blue (`#2563EB`), Poppins + Inter typography (Campora-inspired)
- **Security:** Granular RBAC permissions (`*.view`, `*.create`), tenant isolation, rotating refresh tokens, immutable audit logs
- **API Documentation:** OpenAPI / Swagger at `http://localhost:5000/api/docs`

---

## Getting Started

### 1. Prerequisites
- Node.js >= 20
- pnpm >= 8 (`npm i -g pnpm`)
- Docker & Docker Compose

### 2. Start PostgreSQL & Redis Infrastructure
```bash
docker compose up -d postgres redis
```
- PostgreSQL runs on `localhost:5433` (mapped from 5432 to avoid local conflicts)
- Redis runs on `localhost:6380` (mapped from 6379)

### 3. Setup Environment
```bash
cp .env.example .env
```

### 4. Database Push & Seed
```bash
pnpm install
pnpm run db:push
pnpm run db:seed
```

The seed script creates:
- 45 granular permissions across 10 modules
- Demo organization: `ORBIT Electronics` (`orbit-electronics`)
- 9 System Roles: Super Admin, Org Admin, Operations Manager, Support Agent, Dispatcher, Technician, Warehouse Manager, Finance Officer, Customer
- Demo users with password `admin123`:
  - `admin@orbit.local` (Super Admin)
  - `support@orbit.local` (Support Agent)
  - `dispatcher@orbit.local` (Dispatcher)
  - `tech@orbit.local` (Field Technician)

### 5. Start Development Servers

Run both Backend & Frontend simultaneously:
```bash
pnpm run dev
```

Or run them individually:
```bash
# Backend API (Port 5000)
pnpm run dev:api

# Frontend Web App (Port 5173)
pnpm run dev:web
```

---

## Application URLs

| Service | URL | Description |
|---|---|---|
| **Frontend Portal** | `http://localhost:5173` | React Web application |
| **Backend API** | `http://localhost:5000` | NestJS REST API |
| **API Health** | `http://localhost:5000/api/health` | PostgreSQL + Redis status |
| **Swagger Docs** | `http://localhost:5000/api/docs` | OpenAPI contract explorer |

---

## 1-Click Demo Profiles

On `http://localhost:5173/login`, click any profile card for instant role sign-in:
1. **Admin** (`admin@orbit.local`) — Full system access & role matrix
2. **Support Desk** (`support@orbit.local`) — Customer complaints & ticket triage
3. **Dispatcher** (`dispatcher@orbit.local`) — Scheduling & service order dispatch
4. **Field Tech** (`tech@orbit.local`) — On-site technician diagnostics

---

## Project Structure

```
orbit/
├── apps/
│   ├── api/                     # NestJS modular backend
│   │   └── src/
│   │       ├── common/          # Guards, decorators, filters, interceptors
│   │       ├── infrastructure/  # Database (Prisma), Redis
│   │       └── modules/         # Auth, Identity, Organizations, Health
│   └── web/                     # React 18 + Vite frontend
│       └── src/
│           ├── components/      # UI components & AppLayout shell
│           ├── contexts/        # AuthContext with auto-refresh
│           ├── lib/             # Axios API client, utils
│           ├── pages/           # Auth, Dashboard, Users, Roles, Org, Audit
│           └── routes/          # Protected and public routes
├── prisma/
│   ├── schema.prisma            # 10 core tables with UUID & indexes
│   └── seed.ts                  # Seed script with 45 permissions & demo org
├── docker-compose.yml           # Postgres 16 & Redis 7
├── turbo.json
├── pnpm-workspace.yaml
└── .env
```

---

## Milestone Status

- [x] **Milestone 1 — Foundation (Completed)**
  - Monorepo, Docker Compose, NestJS modular API, Prisma PostgreSQL, Redis
  - Auth (JWT + rotating refresh tokens), PermissionsGuard, AuditInterceptor
  - Seed script (45 permissions, demo org, 9 system roles, 4 demo users)
  - React 18 + Vite frontend with Campora design system & Notion-style layout
  - Dashboard with live metrics, Users management, Roles matrix, Org profile, Audit trails
- [ ] **Milestone 2 — CRM & Product Warranties** (Next)
- [ ] **Milestone 3 — Service Desk & SLA Engine**
- [ ] **Milestone 4 — Field Service & Technician Dispatch PWA**
- [ ] **Milestone 5 — Inventory & Warehouse Ledger**
- [ ] **Milestone 6 — Logistics & Fleet Tracking**
- [ ] **Milestone 7 — Finance, Invoicing & Event Notifications**
- [ ] **Milestone 8 — Operational Analytics & Production Deployment**
