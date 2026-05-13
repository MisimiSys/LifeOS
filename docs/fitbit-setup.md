# Fitbit Bridge Setup

Run this in your Supabase SQL editor:

```sql
create table if not exists public.fitbit_tokens (
  id text primary key,
  access_token text not null,
  refresh_token text not null,
  expires_at timestamptz not null,
  scope text,
  fitbit_user_id text,
  updated_at timestamptz not null default now()
);

create table if not exists public.fitbit_daily_metrics (
  date text primary key,
  source text not null default 'Fitbit',
  sync_status text not null default 'Imported',
  sleep_hours numeric,
  sleep_score integer,
  resting_heart_rate integer,
  steps integer,
  active_zone_minutes integer,
  calories_burned integer,
  distance_km numeric,
  workout_minutes integer,
  weight_kg numeric,
  synced_at timestamptz not null default now()
);
```

Environment variables needed in Vercel:

```txt
VITE_LIFEOS_FITBIT_API_BASE=https://life-os-lac-pi.vercel.app
FITBIT_CLIENT_ID=your_fitbit_client_id
FITBIT_CLIENT_SECRET=your_fitbit_client_secret
FITBIT_REDIRECT_URI=https://life-os-lac-pi.vercel.app/api/fitbit/callback
LIFEOS_WEB_APP_URL=https://misimisys.github.io/LifeOS/
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Fitbit developer app settings:

- OAuth 2.0 application type: `Server`
- Redirect URL: `https://life-os-lac-pi.vercel.app/api/fitbit/callback`
- Scopes: `activity`, `heartrate`, `sleep`, `weight`, `profile`
