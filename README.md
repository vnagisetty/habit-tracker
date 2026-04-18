# Habit Tracker

A full-stack habit tracking web application built with Next.js, Google OAuth, and Google Sheets as the database. Users sign in with their Google account and track daily habits with streaks, heatmaps, and analytics.

🔗 **Live App:** [habit-tracker-blush-sigma.vercel.app](https://habit-tracker-blush-sigma.vercel.app)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│                      Client (Browser)                    │
│              Next.js App Router (React)                  │
└───────────────────────────┬─────────────────────────────┘
                            │ HTTPS
┌───────────────────────────▼─────────────────────────────┐
│                    Vercel (Hosting)                       │
│                                                          │
│  ┌─────────────────┐      ┌──────────────────────────┐  │
│  │   Next.js Pages  │      │     Next.js API Routes   │  │
│  │   /dashboard     │      │   /api/habits            │  │
│  │   /analytics     │      │   /api/habits/complete   │  │
│  │   /auth/signin   │      │   /api/auth/[...nextauth]│  │
│  └─────────────────┘      └──────────────┬───────────┘  │
└──────────────────────────────────────────┼──────────────┘
                                           │
              ┌────────────────────────────┼──────────────┐
              │         Google Cloud        │              │
              │                            │              │
              │  ┌─────────────────┐  ┌────▼───────────┐  │
              │  │  Google OAuth   │  │  Google Sheets  │  │
              │  │  (Auth Login)   │  │  (Database)     │  │
              │  └─────────────────┘  └────────────────┘  │
              └───────────────────────────────────────────┘
```

### Data Flow

1. User visits the app and clicks "Sign in with Google"
2. NextAuth redirects to Google OAuth — user authenticates
3. Google returns user identity (email, name, photo) to the app
4. NextAuth creates a JWT session stored in a cookie
5. All API routes verify the session before accessing data
6. A service account (not the user) reads/writes the shared Google Sheet
7. Data is always scoped by `userId` so users only see their own habits

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 14 (App Router) | Pages and UI |
| Styling | Tailwind CSS + shadcn/ui | Components and design |
| Auth | NextAuth.js + Google OAuth | User login |
| Database | Google Sheets API | Storing habits and logs |
| Charts | Recharts | Analytics visualizations |
| Hosting | Vercel | Deployment and CI/CD |
| Repo | GitHub | Source control |

---

## Features

- **Google Login** — one-click sign in, no passwords
- **Add Habits** — name and categorize habits (Health, Fitness, Learning, Mindfulness, Other)
- **Daily Check-ins** — mark habits complete with animated checkboxes
- **Streak Tracking** — fire badge showing consecutive days completed
- **Weekly Heatmap** — visual 7-day history per habit
- **Analytics Dashboard** — 90-day heatmap, completion rates, and bar charts
- **Multi-user** — each user sees only their own data
- **Mobile Responsive** — works on phones and tablets

---

## Google Sheets Database Schema

All user data is stored in a single Google Sheet with two tabs:

**`habits` tab**
| Column | Type | Description |
|---|---|---|
| id | UUID | Unique habit identifier |
| userId | string | User's Google email |
| name | string | Habit name |
| category | string | Health / Fitness / Learning / etc. |
| createdAt | date | When habit was created |

**`logs` tab**
| Column | Type | Description |
|---|---|---|
| userId | string | User's Google email |
| habitId | UUID | Reference to habits tab |
| date | YYYY-MM-DD | Date of completion |
| completedAt | ISO timestamp | Exact time of completion |

---

## Prerequisites

- [Node.js 18+](https://nodejs.org)
- A Google account
- A [Google Cloud Project](https://console.cloud.google.com) with:
  - Google Sheets API enabled
  - Google Drive API enabled
  - OAuth 2.0 credentials (Client ID + Secret)
  - A Service Account with a JSON key

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/vnagisetty/habit-tracker.git
cd habit-tracker
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up Google Cloud

#### Enable APIs
1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project
3. Enable **Google Sheets API** and **Google Drive API**

#### Create OAuth Credentials (for user login)
1. Go to **APIs & Services → Credentials → Create Credentials → OAuth client ID**
2. Application type: **Web application**
3. Add authorized redirect URI: `http://localhost:3000/api/auth/callback/google`
4. Copy **Client ID** and **Client Secret**

#### Create a Service Account (for Sheets access)
1. Go to **APIs & Services → Credentials → Create Credentials → Service account**
2. Name it `habit-tracker-sheets`
3. Go to **Keys tab → Add Key → Create new key → JSON**
4. Download the JSON file — copy `client_email` and `private_key`

### 4. Set up Google Sheet

1. Create a new Google Sheet at [sheets.google.com](https://sheets.google.com)
2. Name it `Habit Tracker DB`
3. Create two tabs:
   - `habits` with headers: `id | userId | name | category | createdAt`
   - `logs` with headers: `userId | habitId | date | completedAt`
4. Share the sheet with your service account email (Editor access)
5. Copy the Sheet ID from the URL

### 5. Configure environment variables

```bash
cp .env.local.example .env.local
```

Fill in `.env.local`:

```env
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-your-client-secret
NEXTAUTH_SECRET=your-random-32-byte-secret
NEXTAUTH_URL=http://localhost:3000

GOOGLE_SHEETS_ID=your-google-sheet-id
GOOGLE_SERVICE_ACCOUNT_EMAIL=habit-tracker-sheets@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
```

Generate `NEXTAUTH_SECRET`:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### 6. Run the app

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Deployment (Vercel)

### 1. Push to GitHub

```bash
git add .
git commit -m "initial commit"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com) → **Add New Project**
2. Import your GitHub repository
3. Add all environment variables from `.env.local`
4. Set `NEXTAUTH_URL` to your Vercel URL: `https://your-app.vercel.app`
5. Click **Deploy**

### 3. Update Google Cloud Console

Add your production URL to OAuth credentials:
- **Authorized JavaScript origins:** `https://your-app.vercel.app`
- **Authorized redirect URIs:** `https://your-app.vercel.app/api/auth/callback/google`

### 4. Publish the OAuth app

To allow all Google users to log in (not just test users):
1. Go to **APIs & Services → OAuth Consent Screen**
2. Click **Publish App**

---

## Security Considerations

- `.env.local` is gitignored — never commit real credentials
- The service account only has access to the specific shared sheet
- All API routes verify the user session before returning data
- Data is always filtered by `userId` — users cannot access each other's habits
- Google OAuth handles all authentication — no passwords stored

---

## Project Structure

```
habit-tracker/
├── app/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth API route
│   │   └── habits/               # Habits CRUD API routes
│   ├── auth/signin/              # Custom sign-in page
│   └── dashboard/
│       ├── page.tsx              # Main dashboard
│       └── analytics/            # Analytics page
├── components/
│   └── ui/                       # shadcn/ui components
├── lib/
│   ├── auth.ts                   # NextAuth configuration
│   └── sheets.ts                 # Google Sheets service
├── .env.local.example            # Environment variable template
└── middleware.ts                 # Route protection
```

---

## Future Improvements

- [ ] Edit and delete habits
- [ ] Email or push notification reminders
- [ ] Habit reordering via drag and drop
- [ ] Export data to CSV
- [ ] Dark mode
- [ ] PWA support for mobile install
- [ ] Habit templates (suggested habits)

---

## License

MIT