# Backend (FastAPI)

## Optional demo seed on startup

For local demos/dev, you can automatically seed the menu with starter data.

Set:

```bash
SEED_DEMO_DATA=true
```

Behavior on startup:
- If the database has **no** existing `MenuWeek` and `MenuItem` records, the backend creates:
  - 1 published `MenuWeek`
  - 8 active (`available=true`) `MenuItem` records
- If menu data already exists, seeding is skipped.
- Existing data is never overwritten.

This is intended for demo/dev environments only.
