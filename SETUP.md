# PnL Tracker — Setup Guide

## 1. Supabase Setup

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Run the SQL from `supabase/migrations/001_initial.sql` in the **SQL Editor**
3. Copy your **Project URL** and **anon public key** from Settings → API

## 2. Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key-here
```

## 3. Local Development

```bash
npm install
npm run dev
```

Open http://localhost:5173

## 4. Deploy to Vercel

1. Push to GitHub
2. Import repo in [vercel.com](https://vercel.com)
3. Add environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy

`vercel.json` handles SPA routing automatically.

## Default Account (LucidFlex 25K)

When you first log in, the account setup form is pre-filled with:
- Starting Balance: $25,000
- Trailing EOD Drawdown: $1,500
- Daily Loss Limit: $400
- Qualifying Days: 5 (at $100+ each)
- Payout Range: $500–$1,000

## Features

- **Trailing EOD Drawdown** — HWM only locks in at end-of-day, not intraday
- **Daily loss resets** at midnight each calendar day
- **Visual warnings** fire at 40% and 20% remaining on both drawdown buffer and daily loss
- **Account breached** state when balance hits the drawdown floor
- **Payout tracker** counts days where daily PnL ≥ minimum threshold
- **Calendar heatmap** — color-coded by profit/loss intensity
- **Equity curve** with drawdown floor line overlay
- **Multiple accounts** per user, persist across sessions
