# Google Health Bridge Setup

The current web-app bridge uses Google OAuth plus Google fitness/health scopes, while keeping the same LifeOS daily metrics storage in Supabase.

If you already created these tables earlier, you can keep using them:

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
  source text not null default 'Google Health',
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
VITE_LIFEOS_HEALTH_API_BASE=https://life-os-lac-pi.vercel.app
GOOGLE_HEALTH_CLIENT_ID=your_google_oauth_client_id
GOOGLE_HEALTH_CLIENT_SECRET=your_google_oauth_client_secret
GOOGLE_HEALTH_REDIRECT_URI=https://life-os-lac-pi.vercel.app/api/health/callback
LIFEOS_WEB_APP_URL=https://misimisys.github.io/LifeOS/
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Google OAuth app settings:

- Create a Google OAuth web application client
- Authorized redirect URI: `https://life-os-lac-pi.vercel.app/api/health/callback`
- Scopes requested by LifeOS:
  - `https://www.googleapis.com/auth/fitness.activity.read`
  - `https://www.googleapis.com/auth/fitness.body.read`
  - `https://www.googleapis.com/auth/fitness.heart_rate.read`
  - `https://www.googleapis.com/auth/fitness.sleep.read`

Notes:

- This bridge now follows the newer Google direction instead of the older Fitbit-specific OAuth flow.
- Health Connect still is not directly readable by a plain web app; that path still needs an Android companion layer.
