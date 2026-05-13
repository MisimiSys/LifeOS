import { createClient } from '@supabase/supabase-js'
import type { MealPlanItem } from './domain/lifeos'

export type CompletedFastRecordRow = {
  id: string
  protocol: string
  planned_hours: number
  actual_hours: number
  started_at_iso: string
  ended_at_iso: string
  completed_on: string
}

export type WorkoutLogRow = {
  id: string
  date: string
  plan: string
  focus: string
  status: string
  completed_at_iso: string
}

export type RecipeRow = {
  id: string
  title: string
  tag: string
  carb_signal: string
  base: string
  protein: string
  vehicle: string
  source: string
  updated_at: string
}

export type LiftProgressRow = {
  label: string
  weight: number
  increment: number
  failures: number
  updated_at_iso: string
}

export type MealTimelineRow = {
  id: string
  date: string
  time: string
  title: string
  role: MealPlanItem['role']
  status: MealPlanItem['status']
  carb_signal: MealPlanItem['carbSignal']
  items: string[]
  budget_backup: string | null
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const hasSupabaseConfig = Boolean(supabaseUrl && supabaseAnonKey)

export const supabase = hasSupabaseConfig
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null

async function syncTable<RowType extends Record<string, unknown>>(
  table: string,
  rows: RowType[],
  keyColumn: string,
) {
  if (!supabase) return

  const { data: existingRows, error: existingError } = await supabase.from(table).select(keyColumn)
  if (existingError) throw existingError

  const incomingKeys = new Set(
    rows
      .map((row) => row[keyColumn])
      .filter((value): value is string | number => typeof value === 'string' || typeof value === 'number'),
  )

  const staleKeys = ((existingRows ?? []) as unknown as Array<Record<string, unknown>>)
    .map((row) => row[keyColumn])
    .filter(
      (value): value is string | number =>
        (typeof value === 'string' || typeof value === 'number') && !incomingKeys.has(value),
    )

  if (rows.length > 0) {
    const { error: upsertError } = await supabase.from(table).upsert(rows as never, {
      onConflict: keyColumn,
      ignoreDuplicates: false,
    })
    if (upsertError) throw upsertError
  }

  if (staleKeys.length > 0) {
    const { error: deleteError } = await supabase.from(table).delete().in(keyColumn, staleKeys)
    if (deleteError) throw deleteError
  }
}

export async function fetchLifeOsCloudState() {
  if (!supabase) return null

  const [fasting, workouts, meals, recipes, lifts] = await Promise.all([
    supabase.from('fasting_sessions').select('*').order('completed_on', { ascending: false }),
    supabase.from('workout_logs').select('*').order('completed_at_iso', { ascending: false }),
    supabase.from('meal_timelines').select('*').order('date', { ascending: false }),
    supabase.from('recipes').select('*').order('updated_at', { ascending: false }),
    supabase.from('lift_progress').select('*').order('updated_at_iso', { ascending: false }),
  ])

  const errors = [fasting.error, workouts.error, meals.error, recipes.error, lifts.error].filter(Boolean)
  if (errors.length > 0) {
    throw errors[0]
  }

  return {
    fastingSessions: (fasting.data ?? []) as CompletedFastRecordRow[],
    workoutLogs: (workouts.data ?? []) as WorkoutLogRow[],
    mealTimelines: (meals.data ?? []) as MealTimelineRow[],
    recipes: (recipes.data ?? []) as RecipeRow[],
    liftProgress: (lifts.data ?? []) as LiftProgressRow[],
  }
}

export async function syncLifeOsCloudState(input: {
  fastingSessions: CompletedFastRecordRow[]
  workoutLogs: WorkoutLogRow[]
  mealTimelines: MealTimelineRow[]
  recipes: RecipeRow[]
  liftProgress: LiftProgressRow[]
}) {
  if (!supabase) return

  await Promise.all([
    syncTable('fasting_sessions', input.fastingSessions, 'id'),
    syncTable('workout_logs', input.workoutLogs, 'id'),
    syncTable('meal_timelines', input.mealTimelines, 'id'),
    syncTable('recipes', input.recipes, 'id'),
    syncTable('lift_progress', input.liftProgress, 'label'),
  ])
}

export function subscribeToLifeOsCloudState(onChange: () => void) {
  if (!supabase) return () => {}

  const channel = supabase
    .channel('lifeos-cloud-sync')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'fasting_sessions' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'workout_logs' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'meal_timelines' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'recipes' }, onChange)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'lift_progress' }, onChange)
    .subscribe()

  return () => {
    void supabase.removeChannel(channel)
  }
}
