import {
  Activity,
  Apple,
  CalendarDays,
  CheckCircle2,
  CircleDashed,
  Dumbbell,
  Gauge,
  HeartPulse,
  Moon,
  Smartphone,
  TimerReset,
  Utensils,
} from 'lucide-react'
import './App.css'

type Readiness = 'Green' | 'Yellow' | 'Red'

type DailySignal = {
  label: string
  value: string
  detail: string
  trend: 'good' | 'watch' | 'neutral'
}

type WorkoutBlock = {
  day: string
  title: string
  lifts: string[]
  accessories: string
}

const todaySignals: DailySignal[] = [
  {
    label: 'Fast',
    value: '16:8',
    detail: 'Eating window 12pm-8pm',
    trend: 'good',
  },
  {
    label: 'Nutrition',
    value: 'Yoruba low-carb',
    detail: 'Soup/obe + protein + low-carb vehicle',
    trend: 'good',
  },
  {
    label: 'Training',
    value: 'StrongLifts A',
    detail: 'Squat, bench, row',
    trend: 'neutral',
  },
  {
    label: 'Sync',
    value: 'Health Connect',
    detail: 'Fitbit app -> Health Connect -> LifeOS',
    trend: 'watch',
  },
]

const weeklyWorkouts: WorkoutBlock[] = [
  {
    day: 'Monday',
    title: 'Workout A',
    lifts: ['Back Squat 5x5', 'Bench Press 5x5', 'Barbell Row 5x5'],
    accessories: 'Dips, plank, elliptical cooldown',
  },
  {
    day: 'Wednesday',
    title: 'Workout B',
    lifts: ['Back Squat 5x5', 'Overhead Press 5x5', 'Deadlift 1x5 or Trap Bar 3x3-5'],
    accessories: 'Lat pulldown, leg curl, mobility',
  },
  {
    day: 'Friday',
    title: 'Workout A',
    lifts: ['Back Squat 5x5', 'Bench Press 5x5', 'Barbell Row 5x5'],
    accessories: 'Farmer carry, dumbbell row, easy Zone 2',
  },
]

const foodRules = [
  'Fasting suppers: ewedu, efo riro, ila alasepo, obe ata, ayamase-style sauce',
  'Low-carb vehicles: cabbage swallow, eggplant swallow, cauliflower rice, cabbage rice',
  'Relax days: controlled amala, ofada, ewa, asaro, roasted corn + ube',
  'No-go signal: prawns, catfish, crayfish, afang, ogbono, oha, nsala, miyan kuka, miyan taushe, tuwo shinkafa',
]

const syncFields = [
  'Sleep hours',
  'Sleep score',
  'Resting HR',
  'Steps',
  'Active Zone Minutes',
  'Calories',
  'Workout minutes',
  'Weight',
]

function readinessLabel(readiness: Readiness) {
  if (readiness === 'Green') return 'Train as planned'
  if (readiness === 'Yellow') return 'Train, hold load'
  return 'Recovery day'
}

function App() {
  const readiness: Readiness = 'Green'

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="LifeOS navigation">
        <div className="brand-lockup">
          <div className="brand-mark">
            <HeartPulse size={24} aria-hidden="true" />
          </div>
          <div>
            <p>LifeOS</p>
            <span>Health command center</span>
          </div>
        </div>

        <nav>
          <a href="#today" className="active">
            <Gauge size={18} aria-hidden="true" />
            Today
          </a>
          <a href="#fasting">
            <TimerReset size={18} aria-hidden="true" />
            Fasting
          </a>
          <a href="#nutrition">
            <Utensils size={18} aria-hidden="true" />
            Nutrition
          </a>
          <a href="#fitness">
            <Dumbbell size={18} aria-hidden="true" />
            Fitness
          </a>
          <a href="#sync">
            <Smartphone size={18} aria-hidden="true" />
            Sync
          </a>
        </nav>
      </aside>

      <section className="workspace">
        <header className="topbar">
          <div>
            <span className="eyebrow">May 2026 build</span>
            <h1>LifeOS Command Center</h1>
          </div>
          <div className={`readiness readiness-${readiness.toLowerCase()}`}>
            <span>{readiness}</span>
            <strong>{readinessLabel(readiness)}</strong>
          </div>
        </header>

        <section id="today" className="hero-grid">
          <article className="fast-card">
            <div className="card-header">
              <TimerReset size={22} aria-hidden="true" />
              <span>Fasting core</span>
            </div>
            <div className="fast-ring" aria-label="Fasting progress 68 percent">
              <span>68%</span>
              <small>fasted</small>
            </div>
            <div className="fast-meta">
              <p>
                <strong>20:00</strong>
                Start
              </p>
              <p>
                <strong>12:00</strong>
                Break fast
              </p>
              <p>
                <strong>8h</strong>
                Eat window
              </p>
            </div>
          </article>

          <div className="signal-grid">
            {todaySignals.map((signal) => (
              <article className={`signal-card signal-${signal.trend}`} key={signal.label}>
                <span>{signal.label}</span>
                <strong>{signal.value}</strong>
                <p>{signal.detail}</p>
              </article>
            ))}
          </div>
        </section>

        <section className="content-grid">
          <article id="nutrition" className="panel nutrition-panel">
            <div className="panel-title">
              <Apple size={20} aria-hidden="true" />
              <h2>Nutrition System</h2>
            </div>
            <div className="plate-visual" aria-label="Yoruba low carb plate model">
              <div>
                <span>Obe / Soup</span>
                <strong>Efo, ewedu, ila</strong>
              </div>
              <div>
                <span>Protein</span>
                <strong>Eggs, gizzard, alaran</strong>
              </div>
              <div>
                <span>Vehicle</span>
                <strong>Cabbage / cauliflower</strong>
              </div>
            </div>
            <ul className="rule-list">
              {foodRules.map((rule) => (
                <li key={rule}>
                  <CheckCircle2 size={16} aria-hidden="true" />
                  {rule}
                </li>
              ))}
            </ul>
          </article>

          <article id="fitness" className="panel">
            <div className="panel-title">
              <Dumbbell size={20} aria-hidden="true" />
              <h2>StrongLifts Home Gym</h2>
            </div>
            <div className="workout-stack">
              {weeklyWorkouts.map((workout) => (
                <div className="workout-row" key={workout.day}>
                  <div>
                    <span>{workout.day}</span>
                    <strong>{workout.title}</strong>
                  </div>
                  <ul>
                    {workout.lifts.map((lift) => (
                      <li key={lift}>{lift}</li>
                    ))}
                  </ul>
                  <p>{workout.accessories}</p>
                </div>
              ))}
            </div>
          </article>

          <article id="sync" className="panel sync-panel">
            <div className="panel-title">
              <Smartphone size={20} aria-hidden="true" />
              <h2>Fitbit Sync Bridge</h2>
            </div>
            <div className="flow-line">
              <span>Fitbit</span>
              <CircleDashed size={18} aria-hidden="true" />
              <span>Health Connect</span>
              <CircleDashed size={18} aria-hidden="true" />
              <span>LifeOS</span>
              <CircleDashed size={18} aria-hidden="true" />
              <span>Notion</span>
            </div>
            <div className="sync-fields">
              {syncFields.map((field) => (
                <span key={field}>{field}</span>
              ))}
            </div>
          </article>

          <article id="fasting" className="panel compact-panel">
            <div className="panel-title">
              <Moon size={20} aria-hidden="true" />
              <h2>Readiness Rules</h2>
            </div>
            <div className="readiness-list">
              <p>
                <span className="dot green"></span>
                Green: progress normally.
              </p>
              <p>
                <span className="dot yellow"></span>
                Yellow: train, hold load.
              </p>
              <p>
                <span className="dot red"></span>
                Red: mobility, Zone 2, rest.
              </p>
            </div>
          </article>

          <article className="panel compact-panel">
            <div className="panel-title">
              <CalendarDays size={20} aria-hidden="true" />
              <h2>Notion Backbone</h2>
            </div>
            <p className="muted">
              Daily Health Log, Fasting Sessions, May Meal Plan, Workout Log, Exercise Library,
              Fitbit Sync Inbox, and Weekly Reviews stay editable in Notion while the app becomes
              the daily interface.
            </p>
          </article>

          <article className="panel compact-panel">
            <div className="panel-title">
              <Activity size={20} aria-hidden="true" />
              <h2>Next Build Slice</h2>
            </div>
            <p className="muted">
              Wire local state to a typed data layer, then add Notion API sync and an Android
              Health Connect bridge for automated Fitbit import.
            </p>
          </article>
        </section>
      </section>
    </main>
  )
}

export default App
