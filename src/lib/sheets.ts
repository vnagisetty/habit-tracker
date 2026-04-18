import { google } from "googleapis"

// ─── Sheet layout ────────────────────────────────────────────────────────────
//
// "habits" sheet columns (1-indexed):
//   A: id  B: userId  C: name  D: category  E: createdAt
//
// "logs" sheet columns (1-indexed):
//   A: userId  B: habitId  C: date (YYYY-MM-DD)  D: completedAt (ISO)
//
// ─────────────────────────────────────────────────────────────────────────────

const SHEET_ID = process.env.GOOGLE_SHEETS_ID!

export interface Habit {
  id: string
  userId: string
  name: string
  category: string
  createdAt: string
}

export interface HabitLog {
  userId: string
  habitId: string
  date: string
  completedAt: string
}

// Singleton auth client — re-used across calls in the same server process.
function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      // The private key is stored with literal \n — replace them at runtime.
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    },
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  })
}

function getSheetsClient() {
  return google.sheets({ version: "v4", auth: getAuth() })
}

// ─── helpers ─────────────────────────────────────────────────────────────────

function rowsToHabits(rows: string[][]): Habit[] {
  return rows.map(([id, userId, name, category, createdAt]) => ({
    id,
    userId,
    name,
    category,
    createdAt,
  }))
}

function rowsToLogs(rows: string[][]): HabitLog[] {
  return rows.map(([userId, habitId, date, completedAt]) => ({
    userId,
    habitId,
    date,
    completedAt,
  }))
}

// ─── Public API ──────────────────────────────────────────────────────────────

/** Return all habits belonging to `userId`. */
export async function getHabits(userId: string): Promise<Habit[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "habits!A2:E",
  })

  const rows = (res.data.values ?? []) as string[][]
  return rowsToHabits(rows).filter((h) => h.userId === userId)
}

/**
 * Record a habit completion. Idempotent — if an entry for the same
 * (userId, habitId, date) already exists it will not be duplicated.
 */
export async function logHabitCompletion(
  userId: string,
  habitId: string,
  date: string
): Promise<void> {
  const sheets = getSheetsClient()

  // Check for an existing entry first.
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "logs!A2:D",
  })
  const rows = (res.data.values ?? []) as string[][]
  const exists = rows.some(
    ([u, h, d]) => u === userId && h === habitId && d === date
  )
  if (exists) return

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "logs!A:D",
    valueInputOption: "RAW",
    requestBody: {
      values: [[userId, habitId, date, new Date().toISOString()]],
    },
  })
}

/** Append a new habit row and return the created habit. */
export async function addHabit(
  userId: string,
  habitName: string,
  category: string
): Promise<Habit> {
  const sheets = getSheetsClient()
  const id = crypto.randomUUID()
  const createdAt = new Date().toISOString()

  await sheets.spreadsheets.values.append({
    spreadsheetId: SHEET_ID,
    range: "habits!A:E",
    valueInputOption: "RAW",
    requestBody: {
      values: [[id, userId, habitName, category, createdAt]],
    },
  })

  return { id, userId, name: habitName, category, createdAt }
}

/**
 * Return all log entries for `userId` within the last `days` calendar days
 * (inclusive of today).
 */
export async function getCompletionHistory(
  userId: string,
  days: number
): Promise<HabitLog[]> {
  const sheets = getSheetsClient()
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: "logs!A2:D",
  })

  const rows = (res.data.values ?? []) as string[][]
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - (days - 1))
  cutoff.setHours(0, 0, 0, 0)

  return rowsToLogs(rows).filter((log) => {
    if (log.userId !== userId) return false
    const logDate = new Date(log.date)
    return logDate >= cutoff
  })
}
