# Habit Tracker Frontend

React + Vite app for tracking habits and sharing progress with supporters.

## Local development

1. `npm install`
2. Copy `.env.example` to `.env` and set `VITE_API_URL` to your backend (default: `http://localhost:3000`)
3. `npm run dev`

## Deploy (Vercel)

- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Environment variable:** `VITE_API_URL=https://habit-tracker-backend-t7h7.onrender.com`

`vercel.json` handles SPA routing so `/profile` and other routes work on refresh.

## Backend

The API runs separately on Render. See the [habit-tracker-backend](https://github.com/muhammed-emad621/habit-tracker-backend) repo.
