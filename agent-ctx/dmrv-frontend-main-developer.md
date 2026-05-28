# dMRV Carbon Credit Platform Dashboard - Frontend Implementation

## Task ID: dmrv-frontend
## Agent: main-developer
## Date: 2025-05-24

## Summary

Built a comprehensive dMRV (Digital Measurement, Reporting & Verification) carbon credit platform dashboard as a single-page Next.js 16 application with 17 view components.

## Architecture

- **Single page**: `/src/app/page.tsx` renders `<DmrvApp />`
- **Shell**: `/src/components/dmrv/DmrvApp.tsx` — Main layout with responsive sidebar, header, and content area
- **16 module views**: Each in `/src/components/dmrv/` directory

## Components Created

1. **DmrvApp.tsx** — Main app shell with collapsible sidebar (Sheet on mobile, fixed on desktop), header with status indicators
2. **DashboardView.tsx** — Stats cards (4 KPIs), recent activity feed, quick actions, system status
3. **OrchestratorView.tsx** — 8-agent workflow pipeline with animated status, run/reset buttons, audit trail, HITL alerts
4. **IngestionView.tsx** — 13 source type selector, ingestion form, log table, classification badges, encryption status
5. **AuthView.tsx** — 5 role cards, permission matrix table (32 permissions), access validation simulator
6. **CarbonView.tsx** — Tabbed calculator (Biochar/AWD/Biogas/Solar/Blue Carbon), emission factor reference table
7. **CertificationView.tsx** — Certificate list, T-VER submission form, detail dialog, status badges
8. **VerificationView.tsx** — Cross-modal validation, integrity score gauge, source coverage display, audit hash
9. **MonitoringView.tsx** — System health metrics, alert list with severity badges, create alert form
10. **ReportingView.tsx** — Report generation form, sustainability report display, Net Carbon Balance, export
11. **MarketplaceView.tsx** — Credit listing (Available/Traded/Retired), mint/trade/retire actions, portfolio
12. **LogisticsView.tsx** — Three tabs (Tracking/Inventory/Settlement), tracking records, settlement amounts
13. **GovernanceView.tsx** — Methodology list with parameters, rules reference, add methodology form
14. **SubmissionView.tsx** — Submission form builder, history table, project selector
15. **AuditView.tsx** — 6 domain audit types, input forms, PASSED/FAILED results, audit timeline
16. **FootprintView.tsx** — Emission factor table (8 factors), scope-based calculator, aggregate footprint
17. **SimulationView.tsx** — 5 activity simulators, parameter inputs, results with eligibility check, history

## Design System

- **Primary Color**: Emerald/green (`text-emerald-600`, `bg-emerald-50`, etc.)
- **Sidebar**: Dark (`bg-slate-900`, `text-white`)
- **Status Colors**: Success=emerald, Warning=amber, Error=red, Info=slate
- **Responsive**: Mobile-first with collapsible sidebar via Sheet component
- **Components**: shadcn/ui (Card, Badge, Tabs, Table, Dialog, Progress, etc.)
- **Icons**: Lucide React

## Technical Decisions

- All components use `'use client'` directive
- Toast notifications via `@/hooks/use-toast` (not sonner, due to ThemeProvider requirement)
- Mock data with `useState` for local state management
- Sidebar component extracted outside DmrvApp to satisfy React hooks lint rules
- ScrollArea with `max-h-96` for long lists
- Tables use proper `overflow-x-auto` wrapper

## Lint Status
✅ All ESLint checks pass cleanly
