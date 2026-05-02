# Health Connect Bridge

Health Connect data is local to Android and permission-gated. A web app cannot read it directly. LifeOS needs a small Android bridge app or native module.

## Primary Flow

```text
Fitbit watch -> Fitbit Android app -> Health Connect -> LifeOS bridge -> Notion
```

## Android Permissions

The bridge should request only the fields LifeOS needs:

- Steps
- Total calories burned
- Exercise sessions / duration
- Distance
- Resting heart rate
- Sleep sessions
- Weight, if used

Historical and background reads require extra permissions. The first version should run manually while the user is present.

## Read Strategy

- Use Health Connect aggregate reads for cumulative values like steps and calories.
- Use record reads for sleep sessions and exercise sessions.
- Create one summary record per day.
- Avoid duplicate Notion rows by checking the date first.

## Notion Mapping

Health Connect daily summary maps into `LifeOS Fitbit Sync Inbox`:

- `Date`
- `Source = Health Connect`
- `Sync Status = Imported`
- `Sleep Hours`
- `Resting HR`
- `Steps`
- `Active Zone Minutes`
- `Calories Burned`
- `Workout Minutes`
- `Weight kg`

Then LifeOS copies or syncs the decision-ready fields to `LifeOS Daily Health Log`.

## Future Implementation Options

1. Native Android app in Kotlin.
2. Expo/React Native app with a custom native Health Connect module.
3. Kotlin bridge app that posts to a small LifeOS backend, which then writes to Notion.

The safest first technical path is a native Kotlin bridge because Health Connect is Android-native.
