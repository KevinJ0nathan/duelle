# Duelle

**Wordle, but faster.** A real-time 1v1 Wordle game where you and an opponent race to guess the same 5-letter word. First to solve it wins.

![Duelle](/public/duelle_thumbnail.png)

## Features

- **Find Opponent** — Jump into the queue and get matched with a random player
- **Private Rooms** — Create a game and share a 4-character code, or join with a friend’s code
- **Real-time Sync** — Live updates via Supabase so both players see the same game state
- **Classic Wordle Rules** — Same 5-letter guessing, green/gold/gray feedback, 6 guesses max
- **Rematch** — Request a rematch when a game ends; both players get a new word
- **Inactivity Win** — Claim a win if your opponent hasn’t moved for a set time
- **Anonymous Play** — No sign-up required; play with anonymous Supabase auth

## Tech Stack

- **Framework:** [Next.js 16](https://nextjs.org) (App Router)
- **UI:** [React 19](https://react.dev), [Tailwind CSS 4](https://tailwindcss.com)
- **Backend / Realtime:** [Supabase](https://supabase.com) (Auth, Database, Realtime)
- **Icons:** [Lucide React](https://lucide.dev)
- **Analytics:** [Vercel Analytics](https://vercel.com/analytics)

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with:
  - Anonymous auth enabled
  - Tables: `games` (private server data), `active_games` (client-visible game state), and a word list table for secret words
  - Realtime enabled on `active_games`

### Install

```bash
git clone <your-repo-url>
cd duelle
npm install
```

### Environment Variables

Create a `.env.local` in the project root:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
```

Use your Supabase project URL and keys from **Project Settings → API**. The service role key is used in server actions only; never expose it to the client.

### Run

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Use **Find Opponent**, **Create a Private Room**, or **Enter Code** + **JOIN** to start a game.

### Scripts

| Command         | Description             |
| --------------- | ----------------------- |
| `npm run dev`   | Start dev server        |
| `npm run build` | Production build        |
| `npm run start` | Start production server |
| `npm run lint`  | Run ESLint              |

## How It Works

1. **Home** — Choose “Find Opponent” (matchmaking), “Create a Private Room” (get a code), or enter a code and “JOIN”.
2. **Waiting** — For private games, the creator sees a join code until the second player joins.
3. **Playing** — Both players see the same secret word (not revealed). You each have up to 6 guesses. Green = correct letter and position; gold = letter in word, wrong position; gray = letter not in word.
4. **Winner** — The first player to guess the word wins. When the game ends, you can request a rematch for a new round.

## Project Structure

```
duelle/
├── app/
│   ├── actions.ts          # Server actions (matchmaking, submit guess, rematch, etc.)
│   ├── page.tsx            # Home: find match, private room, join by code
│   ├── game/[id]/page.tsx  # Game page: board, keyboard, realtime state
│   ├── layout.tsx          # Root layout, fonts, metadata
│   └── globals.css
├── components/
│   └── game/
│       ├── Keyboard.tsx    # On-screen keyboard with feedback colors
│       ├── WordleInput.tsx # Guess rows and current guess
│       └── GameOverModal.tsx
├── hooks/
│   └── useWordle.ts        # Guess state, submit, resume, keyboard handling
└── lib/
    └── supabase.ts         # Supabase browser client
```

## Deploy

The app is set up for [Vercel](https://vercel.com). Connect your repo, add the same env vars in the project settings, and deploy. The project uses `@vercel/analytics` for optional analytics.

