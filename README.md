# InteliChat

InteliChat is a ChatGPT-style AI chat application built with the Next.js App Router. It supports authenticated users, persistent multi-conversation chat, streaming AI responses, and a collapsible sidebar for managing conversations (rename, pin, delete).

**Live demo:** https://inteli-chat.vercel.app/

---

## Features

- **Streaming AI chat** - responses stream token-by-token using the Vercel AI SDK (`streamText` + `useChat`).
- **Web search** - the assistant can search the web in real time using [Exa](https://exa.ai) via AI SDK tool calling, so answers can include up-to-date information.
- **Message branching** - edit or regenerate a message to branch the conversation into alternative paths.
- **Persistent conversations** - every message is stored in Postgres via Prisma, so chats survive reloads.
- **Multi-conversation management** - create, rename, pin/unpin, and delete conversations from the sidebar.
- **Auto-generated titles** - a new chat is renamed from the first user message.
- **Authentication** - Clerk-based sign-in; all app routes are protected by middleware, and users are auto-onboarded into the database on first visit.
- **Light/dark mode** - theme switching via `next-themes`.
- **Modern UI** - shadcn/ui (Base UI) components, Tailwind CSS v4, Lucide icons, Sonner toasts, and markdown rendering with Streamdown.

---

## Tech Stack

| Area | Technology |
|------|-----------|
| Framework | Next.js 16 (App Router, Turbopack), React 19 |
| Language | TypeScript |
| Authentication | Clerk (`@clerk/nextjs`) |
| Database | PostgreSQL (Neon) |
| ORM | Prisma 7 with the `@prisma/adapter-pg` driver adapter |
| AI | Vercel AI SDK (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`); default model `gpt-4o-mini` |
| Web search | Exa (`exa-js`) exposed to the model as an AI SDK tool |
| Data fetching / cache | TanStack React Query |
| UI | shadcn/ui (Base UI), Tailwind CSS v4, Lucide, Sonner, Streamdown |
| Theming | next-themes |

---

## Project Structure

```
app/
  (auth)/sign-in/            # Clerk sign-in route + layout
  (root)/                    # Authenticated app shell
    layout.tsx               # auth.protect() + onboard(), renders ChatShell
    page.tsx                 # creates a new chat and redirects to /c/[id]
    c/[id]/page.tsx          # loads a conversation + its messages
  api/chat/route.ts          # POST endpoint that streams model responses
  layout.tsx                 # Root layout: Clerk + React Query + Theme providers
  globals.css                # Tailwind v4 + theme tokens

features/
  ai/
    actions/chat-store.ts    # load / save (upsert) chat messages
    utils/model.ts           # model resolver (OpenAI)
  auth/action/
    require-user.ts          # resolves the DB user for the current Clerk session
    onboard.ts               # upserts the Clerk user into the database
  conversation/
    actions/conversation-actions.ts   # CRUD + ownership checks
    components/                        # sidebar, conversation view, composer, messages
    hooks/use-conversation.ts          # React Query hooks
    utils/query-keys.ts                # centralized query key factory
  messages/
    actions/messages-action.ts         # message CRUD
    hooks/use-messages.ts              # React Query hooks
  home/actions/start-new-chat.ts       # creates a fresh conversation

components/                  # shadcn/ui primitives + AI elements
lib/
  db.ts                      # Prisma client singleton (driver adapter)
  utils.ts                   # cn() helper
prisma/
  schema.prisma              # User / Conversation / Message models
proxy.ts                     # Clerk middleware (route protection)
```

---

## How It Works

1. **Authentication & onboarding:** `proxy.ts` (Clerk middleware) protects every route except `/sign-in`. The authenticated `(root)` layout calls `auth.protect()` and then `onboard()`, which upserts the Clerk user into the `User` table.
2. **Starting a chat:** visiting `/` runs `startNewChat()`, which creates a `Conversation` and redirects to `/c/[id]`.
3. **The conversation view:** `/c/[id]` loads the conversation (verifying ownership) and its stored messages, then hands them to `ConversationView`, which uses the AI SDK's `useChat` hook. The client only sends the latest message to the server; history is rebuilt server-side.
4. **Streaming:** `POST /api/chat` verifies ownership, persists the incoming user message, calls `streamText`, and streams a `UIMessageStream` back. When the stream ends, the assistant's reply is persisted via `saveChatMessages` (upsert by message id).

---

## Data Model

- **User:** linked to Clerk via `clerkId`; owns many conversations.
- **Conversation:** `title`, optional `model` / `systemPrompt`, `isPinned`, `isarchived`, and `lastMessageAt` (indexed for sidebar ordering).
- **Message:** belongs to a conversation; stores `role`, `status`, `content`, and the raw `parts`/`metadata` JSON. Cascades on conversation delete.

---

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A PostgreSQL database (e.g. [Neon](https://neon.tech))
- A [Clerk](https://clerk.com) application
- An [OpenAI](https://platform.openai.com) API key

### 1. Install dependencies

```bash
npm install
```

> `postinstall` automatically runs `prisma generate` to create the Prisma client in `lib/generated/prisma`.

### 2. Configure environment variables

Create a `.env` file in the project root:

```bash
# PostgreSQL (Neon). Use the pooled connection string for the app.
DATABASE_URL="postgresql://<user>:<password>@<host>/<db>?sslmode=require"

# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_test_..."
CLERK_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_CLERK_SIGN_IN_URL="/sign-in"
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL="/"
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL="/"

# OpenAI
OPENAI_API_KEY="sk-..."

# Exa (web search)
EXA_API_KEY="your-exa-api-key"
```

### 3. Set up the database

```bash
npx prisma migrate dev
```

> **Neon note:** migrations require a **direct** (non-pooled) connection. If you hit a `P1002` advisory-lock timeout, point Prisma Migrate at the non-`-pooler` host.

### 4. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start the Next.js dev server |
| `npm run build` | `prisma generate` then `next build` |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

---

## Deployment (Vercel)

1. Push the repo to GitHub and import it into Vercel.
2. Add all environment variables (from the `.env` section above) in **Project > Settings > Environment Variables**.
3. Deploy. The `postinstall` / `build` scripts regenerate the Prisma client on every build, since the generated client (`lib/generated/prisma`) is gitignored.

Live deployment: **https://inteli-chat.vercel.app/**
