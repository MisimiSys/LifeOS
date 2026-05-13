# Android Health Connect Next Step

This repo now has:

- a secure ingest endpoint at `/api/health/ingest`
- a Capacitor config for a future Android shell
- a small client helper at `src/mobile/phoneHealthSync.ts`

## What still needs to be built

The missing layer is the Android-side reader that can:

1. request Health Connect permissions
2. read daily steps, sleep, heart rate, weight, and workout totals
3. build a `PhoneHealthSnapshot`
4. `POST` it to `/api/health/ingest`

## Recommended approach

Use a Capacitor Android shell for LifeOS and add a native plugin or bridge that reads Health Connect.

## Suggested daily sync payload

```json
{
  "date": "2026-05-13",
  "source": "Phone Health Sync",
  "sleep_hours": 7.2,
  "sleep_score": 81,
  "resting_heart_rate": 66,
  "steps": 6305,
  "active_zone_minutes": 21,
  "calories_burned": 2264,
  "distance_km": 4.8,
  "workout_minutes": 42,
  "weight_kg": 101.5
}
```

## Proposed implementation order

1. install Capacitor dependencies
2. run `npx cap init` if you want to regenerate config interactively
3. run `npx cap add android`
4. create a native Health Connect bridge
5. call `postPhoneHealthSnapshot()` from the mobile shell after permissioned reads
6. refresh desktop from Supabase

## Why this is the right model

- Health Connect lives on Android
- Fitbit app lives on Android
- LifeOS is mobile first
- desktop is best treated as the shared dashboard, not the collector
