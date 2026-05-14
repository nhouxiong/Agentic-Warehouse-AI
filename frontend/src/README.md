# DockOps Frontend - Complete Source

This folder contains all files for the DockOps dashboard. Copy them into your Vite project's `src/` folder.

## Setup

```bash
# 1. Create Vite React project (if you haven't)
npm create vite@latest dockops-frontend -- --template react
cd dockops-frontend

# 2. Install dependencies
npm install recharts

# 3. Copy all files from this folder into src/
# Folder structure should look like:
#   src/
#     App.jsx
#     api/client.js
#     components/header/Header.jsx
#     components/live/*.jsx
#     components/planning/*.jsx
#     components/analytics/*.jsx
#     styles/globals.css
#     tabs/LiveOps.jsx
#     tabs/Planning.jsx
#     tabs/Analytics.jsx

# 4. Update src/main.jsx to import App from "./App"
# (Vite default already does this)

# 5. Create .env file in project root:
echo "VITE_API_URL=http://localhost:8000" > .env

# 6. Run dev server
npm run dev
```

## Architecture

```
src/
├── App.jsx                          # Root, tab switching, dark mode toggle
├── api/
│   └── client.js                    # All API calls + transformers
├── styles/
│   └── globals.css                  # Light + dark mode CSS variables
├── tabs/
│   ├── LiveOps.jsx                  # Real-time floor view
│   ├── Planning.jsx                 # Recommendations + simulation
│   └── Analytics.jsx                # 90-day trends, ROI, carriers
└── components/
    ├── header/
    │   └── Header.jsx               # Tab nav, search, role, dark mode
    ├── live/
    │   ├── ActionAlert.jsx          # Top banner showing changes
    │   ├── Next2Hours.jsx           # Horizontal arrival strip
    │   ├── KpiStrip.jsx             # 5 KPI cards with comparisons
    │   ├── DockHeatmap.jsx          # 10x16 occupancy grid
    │   ├── HighRiskCarriers.jsx     # ML-flagged carriers today
    │   └── ZoneWorkload.jsx         # Zone capacity bars + notes
    ├── planning/
    │   ├── BeforeAfterChart.jsx     # Hourly congestion bars
    │   ├── RecommendationCard.jsx   # Accept/Reject/feedback
    │   ├── MonteCarloCard.jsx       # Plain English confidence
    │   ├── MlExplainer.jsx          # Why we use ML
    │   ├── CrossAgentHandoff.jsx    # Agent 1 → Agent 2 status
    │   └── IntegrationStatus.jsx    # WMS connected badge
    └── analytics/
        ├── RoiCards.jsx             # Cost saved, breaches avoided
        ├── ActionableInsight.jsx    # "3 carriers cost $42K"
        ├── FullWidthTrendChart.jsx  # 90-day KPI line charts
        └── CarrierScorecardTable.jsx # Sortable carrier list
```

## Backend Required

Make sure your FastAPI backend is running:

```bash
cd warehouse-agent-system-main
python3 -m uvicorn main:app --reload --port 8000
```

The frontend calls these endpoints:
- `POST /api/pipeline/run` - Run agent pipeline
- `GET /api/schedule?date=` - Get appointments
- `GET /api/kpis?date=` - Get KPIs
- `GET /api/carriers` - Carrier list
- `GET /api/history?days=` - Historical data
- `GET /api/ml/models` - ML model metadata

## Features Built

- 3 tabs: Live Ops, Planning, Analytics
- Dark mode toggle (auto-saves to localStorage)
- Mobile responsive (stack on < 768px)
- Search bar in header
- Role selector (Supervisor/Manager/Executive)
- Warehouse selector
- Real-time KPI strip with last-week comparisons
- Severity heatmap with hover tooltips
- High-risk carrier list (filtered from today's appointments)
- Zone workload bars with notes
- Recommendation cards with Accept/Reject + feedback modal
- Before/After projection chart
- Monte Carlo plain English + technical details toggle
- ML model explainer
- Cross-agent handoff visualization
- WMS integration status badge
- ROI cards (cost saved, breaches avoided)
- Actionable insight callouts
- 90-day trend lines with target reference
- Carrier scorecard with sortable columns + sparklines

## What Each Tab Does

**Live Ops** - For warehouse supervisors. Shows what's happening RIGHT NOW. Changes since last view, next 2 hours of arrivals, current KPIs vs last week, dock occupancy heatmap, high-risk carriers arriving today, zone workload.

**Planning** - For ops managers. Review tomorrow's schedule, accept or reject recommendations, see Monte Carlo confidence, watch cross-agent handoff, confirm WMS integration. Toolbar has undo + audit.

**Analytics** - For executives. 90-day cost saved, SLA breaches avoided, recommendation accuracy. Full-width trend lines for each KPI. Carrier scorecard sortable by cost impact. Export PDF or schedule weekly email.

## Customization

Colors in `styles/globals.css` use CSS variables. To change:
- `--accent-blue`, `--accent-purple`, etc. for accent colors
- `--bg-card`, `--bg-page` for backgrounds
- `--text-primary`, `--text-secondary` for text

All components use these variables, so changing one variable updates everywhere.

## Production Notes

For production, additional work needed (not yet built):
- WebSocket connection for real-time updates (currently uses polling)
- Actual notification system (Slack, email, SMS)
- PDF export implementation (use jsPDF + html2canvas)
- Note system backend (currently shows static example)
- Drill-down drawer (currently shows ↗ but doesn't open drawer)
- Audit log modal
- Multi-warehouse data fetching (currently hardcoded to Chicago DC-1)
- Authentication + role-based permissions

These are stubs in the UI. Backend implementation needed to make them functional.
