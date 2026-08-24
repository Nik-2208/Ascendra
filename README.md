# ASCENDRA RPG

A production-ready, gamified life operating system built as a Next.js full-stack application. Turn your daily tasks and life goals into an epic RPG adventure!

## Features

- **Command Center:** Real-time dashboard of your level, XP, coins, and active quests.
- **Quest System:** Daily, weekly, and epic quests with natural language parsing.
- **Boss Arena:** Link your largest goals to boss fights. Deal damage by completing related quests.
- **Urge Battles:** Fight your bad habits in interactive encounters.
- **Smart Scheduler:** An AI-powered timeline view that maps tasks to your peak energy hours.
- **AI Coach:** Receive data-driven insights on your productivity and habit patterns.
- **Skill Tree:** Unlock permanent buffs using skill points gained from leveling up.
- **Reward Shop:** Spend your hard-earned coins on real-world rewards you configure.
- **Money Jar:** A digital twin mapping your positive habits to real-world savings.
- **PWA Support:** Installable as a mobile app for offline access.
- **Web Audio API:** Synthesized RPG sound effects directly in the browser.

## Tech Stack

- **Framework:** Next.js (App Router)
- **Styling:** Tailwind CSS v4 + Shadcn UI (Customized)
- **Backend:** Firebase (Firestore + Auth)
- **State Management:** Zustand
- **Animations:** Framer Motion (Coming soon) / Tailwind Animate
- **PWA:** Serwist

## Setup Instructions

1. **Clone & Install:**
   ```bash
   npm install
   ```

2. **Firebase Setup:**
   - Create a project on [Firebase Console](https://console.firebase.google.com/).
   - Enable **Firestore Database** and **Authentication** (Email/Password).
   - Get your client config and create a `.env.local` file based on `.env.example`.
   - Generate a private key from Project Settings > Service Accounts and add it to `.env.local`.

3. **Run Locally:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`. Create a new character from the sign-in screen.

## Deployment

This application is optimized for deployment on [Vercel](https://vercel.com).
Ensure you add all your `.env` variables to your Vercel project settings before deploying.
