# Alternative Data Radar Architecture

## Runtime Flow

1. A scheduler calls `POST /api/signals/collect` every six hours.
2. The route sends target careers and pricing URLs to Bright Data Web Unlocker.
3. Raw HTML is passed to AI/ML API for structured extraction.
4. The server calculates a 0-100 health score and writes a row to Supabase.
5. The frontend loads `company_signals` and renders trends plus AI alerts.

## Filesystem Diagram

```txt
.
├── src/
│   ├── app/
│   │   ├── api/
│   │   │   └── signals/
│   │   │       ├── collect/route.ts      # Cron endpoint and live collection orchestration
│   │   │       └── latest/route.ts       # JSON endpoint for latest signal rows
│   │   ├── globals.css                   # Tailwind layers and global tokens
│   │   ├── layout.tsx                    # Metadata and font setup
│   │   └── page.tsx                      # Landing page and dashboard shell
│   ├── components/
│   │   ├── Dashboard.tsx                 # Interactive workbench and alert feed
│   │   ├── MetricCard.tsx                # Reusable KPI card
│   │   └── SignalChart.tsx               # Recharts visualizations
│   ├── lib/
│   │   ├── aiml.ts                       # AI/ML API adapter
│   │   ├── brightData.ts                 # Bright Data Web Unlocker adapter
│   │   ├── demoData.ts                   # Small local dataset used only in DEMO_MODE
│   │   ├── env.ts                        # Environment helpers
│   │   ├── scoring.ts                    # Health score logic
│   │   └── supabase/
│   │       ├── server.ts                 # Supabase admin client
│   │       └── signals.ts                # Signal repository
│   └── types/
│       └── signals.ts                    # Shared domain types
├── supabase/
│   └── schema.sql                        # Database table, index, and read policy
├── .env.example                          # Required keys and demo flag
├── package.json                          # Next.js, Supabase, Recharts, Tailwind dependencies
└── docs/
    └── architecture.md                   # Dependency and flow notes
```

## Environment Placeholders

`DEMO_MODE=true` keeps the app running without API keys. To enable live collection, set `DEMO_MODE=false` and fill:

- `BRIGHT_DATA_API_KEY`
- `BRIGHT_DATA_WEB_UNLOCKER_ZONE`
- `AIML_API_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`

## Notes For Live Setup

- Bright Data payment/account setup is intentionally not automated here.
- The current web traffic index is a placeholder until a traffic provider is selected.
- `POST /api/signals/collect` expects a JSON body matching `CompanyTarget`.
