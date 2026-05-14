# Engineering Audit Log

Between the initial prototype and this handover, 24 issues were systematically identified through end-to-end testing and patched. This log documents what was found, why it was a problem, and how it was fixed. Every entry references the file changed.

## Critical fixes (truth-in-numbers)

These are the fixes that materially change what the system reports to operators. Without them, the system produced numbers that did not reflect actual operational state.

### Fix 5: Hardcoded improvement percentages

**File:** `backend/tools/kpi_engine.py`
**Issue:** `compute_agent_impact` multiplied baseline by literal constants (0.47, 0.38, 0.60, 0.75, 0.60), so every date in every warehouse returned identical "improvement" percentages regardless of actual operational state.
**Fix:** Improvement now derived from actual simulation peak occupancy change, critical-task share, zones-isolated count, and recommendation outcomes.
**Verification:** Pipeline run on three different dates produces three distinct improvement percentages; previously all returned -47% / -60%.

### Fix 6: ROI cards returned fabricated counts

**File:** `backend/main.py` `/api/recommendation_outcomes`
**Issue:** Endpoint returned hardcoded `acceptance_rate = 0.73`, `effectiveness_rate = 0.80`, `cost_per = $170`. Frontend displayed "$184,200 saved, 86% Monte Carlo verified" with none of these tied to real user actions.
**Fix:** Endpoint now reads actual accept/reject counts from the audit trail. Effectiveness and cost-saved fields return null with explanatory note pending WMS outcome data.

### Fix 7: "Pushed to WMS" misrepresentation

**File:** `frontend/src/tabs/Planning.jsx`
**Issue:** Acceptance banner displayed "Pushed to WMS at HH:MM" with no WMS integration in the system.
**Fix:** Changed to "Logged to audit trail at HH:MM" — accurate description of what acceptance actually does.

### Fix 8: Weak ML models presented as production

**Files:** `backend/main.py`, `frontend/src/components/planning/MlExplainer.jsx`
**Issue:** Wait-time model (R² = 0.04) and task-completion model (R² = 0.10) were exposed via prediction endpoints and shown on the dashboard alongside dock-utilization (R² = 0.93) and unload-duration (R² = 0.54).
**Fix:** Production gate at R² ≥ 0.30. Models below threshold are flagged experimental, hidden from dashboard, and prediction endpoints return 503.

### Fix 9: Frontend KPI fallbacks disguised backend failure

**File:** `frontend/src/api/client.js`
**Issue:** `transformKpis` fell back to `19.5 → 10.3` (the README "tested results" numbers) when the backend returned zeros or failed. Dashboard appeared functional even when upstream was broken.
**Fix:** Removed numeric fallbacks. Components now show "Unavailable" rather than fabricated baselines.

## Functional fixes (broken features made working)

### Fix 1: Missing python-multipart

**File:** `backend/requirements.txt`
**Issue:** Backend failed to import because `/api/upload/schedule` uses `UploadFile`, which requires python-multipart, not in requirements.
**Fix:** Pinned python-multipart 0.0.17. All requirements now version-pinned.

### Fix 2: Folder name with literal space

**Issue:** Backend folder was `warehouse-agent-system-main 4` (with space). Broke shell quoting and Docker build context paths.
**Fix:** Renamed to `backend/`. Updated docker-compose.yml. Removed obsolete `version: "3.8"`. Added .gitignore for .DS_Store, __MACOSX, dist/, etc.

### Fix 3: Invalid LLM model identifiers

**Files:** `backend/config.py`, `backend/agents/dock_scheduler.py`, `backend/agents/task_prioritizer.py`
**Issue:** Model strings `claude-sonnet-4-5-20250514` and `gpt-4` (deprecated) returned 404 from the providers.
**Fix:** Updated to `claude-sonnet-4-5` and `gpt-4o`.

### Fix 4: Undo silently succeeded on bad IDs

**File:** `backend/main.py` `/api/undo`
**Issue:** Non-numeric action IDs were converted to 0, which "succeeded" but undid nothing. User received `{"status": "undone"}` for an action that wasn't undone.
**Fix:** Returns 400 on non-numeric IDs, 404 on unknown action, 409 if already undone or not undoable.

### Fix 10: CSV upload was a dead feature

**Files:** `backend/tools/dock_tools.py`, `backend/tools/task_tools.py`, `backend/tools/kpi_engine.py`, `backend/main.py`
**Issue:** Upload endpoint wrote `uploaded_schedule.csv` but no code path read it. UI said "loaded" with no operational effect.
**Fix:** All three `_load` helpers now prefer the upload override. Added DELETE endpoint to clear override and GET status endpoint. Frontend has revert button.

### Fix 11: Planning tab didn't refresh on warehouse change

**File:** `frontend/src/tabs/Planning.jsx`
**Issue:** Effect dependency array was `[date]`, missing `warehouse`. Switching warehouse showed stale data.
**Fix:** Changed to `[date, warehouse]`.

### Fix 12: Anthropic tool specs were stunted

**Files:** `backend/agents/dock_scheduler.py`, `backend/agents/task_prioritizer.py`
**Issue:** Anthropic `_run_anthropic` generated tool specs that gave every tool a single `{date}` parameter, ignoring zone, status, and other filters available in the OpenAI specs.
**Fix:** Added `_openai_to_anthropic_tools` converter so both providers see the same complete tool surface.

## Validation and safety hardening

### Fix 13: Date validation

**File:** `backend/main.py`
**Issue:** Malformed dates and dates outside the data range returned 200 with all-zero KPIs.
**Fix:** Returns 400 on malformed format, 404 on out-of-range with the actual available range in the error message.

### Fix 14: Unknown warehouse silently became Chicago

**File:** `backend/main.py`
**Issue:** `_get_profile("Atlantis DC-9")` returned Chicago's config with no warning.
**Fix:** Returns 404 with the list of known warehouses.

### Fix 15: Monte Carlo n_trials = 0 returned 500

**File:** `backend/main.py`
**Issue:** Empty array operations crashed with 500.
**Fix:** Pydantic `Field(ge=1, le=10000)` rejects with 422 before handler runs.

### Fix 16: ML predictor accepted negative and absurd inputs

**File:** `backend/main.py`
**Issue:** `pallet_count=-5` returned 36.5 min; `pallet_count=999999` returned 85.6 min; `carrier_tier=junk` silently became "standard".
**Fix:** FastAPI `Query` validators with bounds and pattern matching.

### Fix 17: No file-size limit on CSV upload

**File:** `backend/main.py`
**Issue:** Unbounded `await file.read()` followed by full pandas load. Trivial DoS vector.
**Fix:** 10 MB byte limit, 100,000 row limit, both returning 413.

### Fix 18: Error swallowing masked real bugs

**File:** `backend/main.py` (every endpoint)
**Issue:** `except Exception: raise HTTPException(500, "Failed to load schedule")` with no logging anywhere. Operators saw generic errors with no diagnostic information.
**Fix:** Module-level logger, `logger.exception(...)` in every except block, global unhandled-exception handler.

### Fix 19: CORS open, no auth, binds to 0.0.0.0

**File:** `backend/main.py`
**Issue:** Default config exposed all write endpoints to any LAN user.
**Fix:** Bind to `127.0.0.1` by default. Optional `API_KEY` env var; when set, all write endpoints require `X-API-Key` header. CORS limited to specific localhost origins.

## Cleanup sweep

### Fix 20a–j: Multiple small items

- `np.random.RandomState` (legacy) → `np.random.default_rng` in SimPy
- Monte Carlo noise now seeded with `default_rng(42)` for reproducibility
- `init_db()` and `seed_default_warehouses()` moved from import-time side effects into `@app.on_event("startup")`
- Dockerfile no longer swallows data generation and model training errors
- Deleted obsolete `socket.io-client` (no backend Socket.IO server)
- Deleted committed `dist/` (frontend should be rebuilt at deploy time)
- Removed redundant Streamlit dashboard (kept React only)
- `_sanitize` NaT handling uses `pd.isnull` with try/except guard
- Time comparisons converted from string to minutes-since-midnight

## Post-handover patches (4 additional fixes)

These surfaced during stress-dataset testing after the initial 20 fixes.

### Fix 21: Date endpoints didn't honor upload override

**File:** `backend/main.py`
**Issue:** Fix 10 made `_load()` prefer `uploaded_schedule.csv`, but `_latest_date()` and `/api/data/dates` still read `dock_appointments.csv` directly. Frontend showed stale 2024 dates after a 2026 upload.
**Fix:** New `_appointments_df()` helper as single source of truth. All date endpoints use it.

### Fix 22: Empty schedule path missing summary key

**File:** `backend/tools/dock_tools.py`
**Issue:** `get_todays_schedule` empty return was `{date, total_appointments, appointments}` — no `summary` key. Crashed `dock_scheduler.run_rule_mode` with `KeyError: 'summary'`.
**Fix:** Empty path now returns full summary skeleton with zero-valued fields.

### Fix 23: NaN crashes on unknown carriers

**Files:** `backend/tools/dock_tools.py`, `backend/tools/task_tools.py`, `backend/core/simulation/simpy_engine.py`
**Issue:** Uploaded appointments referencing carrier IDs not in carriers.csv produced `NaN` values that crashed `timedelta(minutes=NaN)`.
**Fix:** Default values applied for unknown carriers (on-time rate 0.75, avg delay 20 min, tier "standard").

### Fix 24: Empty queue path inconsistent shape

**Files:** `backend/tools/task_tools.py`
**Issue:** `score_tasks` and `simulate_reprioritization` had different return shapes for empty vs populated queues, breaking downstream consumers.
**Fix:** Empty paths now return shape-consistent results with zero-valued fields.

## Verification

Final post-handover testing matrix (all expected outcomes verified):

| Test | Expected | Result |
|------|----------|--------|
| Pipeline on 4 different dates produces different improvement % | Different numbers each date | ✓ |
| `/api/undo` with action_id="abc" | 400 | ✓ |
| `/api/kpis?date=bad-date` | 400 | ✓ |
| `/api/kpis?date=2099-01-01` | 404 | ✓ |
| `/api/kpis?warehouse=Nonexistent` | 404 | ✓ |
| `/api/montecarlo` with n_trials=0 | 422 | ✓ |
| Upload 50,000 row CSV | accepted | ✓ |
| Upload 200,000 row CSV | 413 | ✓ |
| ML predict on wait_time (R²=0.04) | 503 | ✓ |
| All 11 GET smoke-test endpoints | 200 | ✓ |
