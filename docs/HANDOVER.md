# Handover Guide

A runbook for engineers picking up this prototype.

## What you're getting

A working prototype of a two-agent warehouse decision support system. The system is **advisory only** — every recommendation requires human approval, and acceptance writes to a local audit log rather than a live Warehouse Management System. The data layer ships with 89 days of synthetic operational data designed to stress-test the agents' detection paths. Real data can be substituted by file replacement or upload.

## Local setup without Docker

### Backend

```bash
cd backend
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Optional: enable LLM mode for either provider
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...

uvicorn main:app --reload --port 8000
```

The API is now at `http://localhost:8000`. Visit `http://localhost:8000/docs` for the interactive Swagger UI.

### Frontend

```bash
cd frontend
npm install
VITE_API_URL=http://localhost:8000 npm run dev
```

Frontend is at `http://localhost:5173` in development mode.

## Setup with Docker

```bash
docker compose up
```

Backend on port 8000, frontend on port 3000. The Dockerfile generates synthetic data and trains ML models on first build; subsequent builds reuse cached artifacts.

## Configuration

All decision thresholds, scoring weights, and KPI targets are defined as constants in `backend/config.py`. The full reference is in `docs/LOGIC_AND_ASSUMPTIONS.docx` Section 18.

Key environment variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `HOST` | `127.0.0.1` | Bind address. Set to `0.0.0.0` only when intentionally exposing beyond localhost |
| `API_KEY` | unset | If set, write endpoints require `X-API-Key` header matching this value |
| `CORS_ORIGINS` | `http://localhost:3000,http://localhost:5173` | Comma-separated allowed origins |
| `OPENAI_API_KEY` | unset | Required only for `mode=llm&provider=openai` |
| `ANTHROPIC_API_KEY` | unset | Required only for `mode=llm&provider=anthropic` |
| `VITE_API_URL` | `http://localhost:8000` | Frontend → backend URL, baked at build time |
| `VITE_API_KEY` | unset | If set, frontend sends `X-API-Key` on all writes |

## Replacing synthetic data with real data

Two paths are supported.

### Full replacement (recommended for full-feature operation)

```bash
cd backend/data/generated
rm *.csv
# Drop your seven CSVs here. Schemas must match the originals
# — see data/README.md or LOGIC_AND_ASSUMPTIONS.docx Section 3.
```

Restart the backend. Every feature now operates on the real data.

### Schedule-only upload through the UI

In the Planning tab, use the data upload card to upload a CSV containing dock appointments. The schema is `appointment_id, date, scheduled_time, carrier_id, carrier_name, dock_door, destination_zone, shipment_size, pallet_count, expected_duration_mins, po_number, priority`. The upload writes to `backend/data/generated/uploaded_schedule.csv` and is preferred over the original file by every loader.

Note: the upload only replaces appointments. Task logs, shipment history, exceptions, and carriers remain from the underlying dataset. For full-feature operation, replace all seven files.

## API endpoints — most useful for handover testing
Full list at `http://localhost:8000/docs`.

## Troubleshooting

| Symptom | Likely cause | Fix |
|---------|--------------|-----|
| Pipeline returns 500 | Date outside data range | Check `GET /api/data/dates` |
| Date picker stuck on 2024 | Stale uploaded_schedule.csv from earlier session | `rm backend/data/generated/uploaded_schedule.csv` |
| ML predict returns 503 | Model R² below 0.30 production threshold | Use rule-based pipeline; experimental models are intentionally gated |
| Backend won't start | Missing python-multipart | `pip install -r requirements.txt` |
| Frontend shows "Backend unreachable" | Backend not running, or VITE_API_URL points elsewhere | Confirm backend on 8000 and rebuild frontend with correct VITE_API_URL |

## Production deployment notes

The prototype is designed for evaluation, not production. Before live deployment, the following work is required:

- Real authentication (current API_KEY mechanism is a single shared secret, suitable for prototype only)
- WMS write-back integration (currently acceptance only logs to audit trail)
- Replacement of multi-warehouse profile multipliers with real per-site datasets
- Wall-clock SLA reference time (currently hardcoded to 14:00 midday)
- Effectiveness tracking (currently null in ROI cards because no outcome data exists)
- Worker-load balancing overlay to prevent priority-scoring feedback effects on individual workers

See `docs/LOGIC_AND_ASSUMPTIONS.docx` Section 17 for the full known-limitations list.

## Contact

For questions during handover: contact the team via the UIC IDS 560 program office.
