---
name: PnL Tracker Project
description: Full-stack prop firm PnL tracker app built with React+Vite, Supabase, Tailwind CSS
type: project
---

A full-stack prop firm trading journal/PnL tracker built in C:\Users\frimp\Downloads\pnl-tracker.

**Stack:** React 18 + Vite, Supabase (auth + database), Tailwind CSS, Chart.js, react-router-dom v6, date-fns, lucide-react

**Architecture:**
- `src/contexts/AuthContext.jsx` — Supabase auth state
- `src/contexts/AccountContext.jsx` — Account + trade CRUD state
- `src/utils/calculations.js` — All prop firm calculations (trailing EOD drawdown, daily loss, payout progress)
- `src/utils/formatters.js` — Currency, date, R-value formatters
- Pages: Dashboard, TradeLog, Calendar (heatmap), Stats
- Components: Layout, Sidebar (w/ account switcher), AccountSetup modal, AddTradeModal, EquityCurveChart

**Supabase tables:** `accounts`, `trades` — both with RLS policies.
SQL migration at: `supabase/migrations/001_initial.sql`

**Default account:** LucidFlex 25K ($25k balance, $1500 trailing DD, $400 daily loss, 5 qualifying days at $100+)

**Why:** To build a prop-firm-focused alternative to TradeZella/TopStep that correctly implements trailing EOD drawdown (HWM only updates at EOD, not intraday).

**How to apply:** When working on this project, the key differentiator is the trailing EOD drawdown calculation in calculations.js. Don't confuse with intraday trailing stops.
