# NextFlow — LLM Workflow Builder

A Galaxy.ai-inspired workflow builder focused on LLM pipelines. Build visual DAG workflows with image processing and Gemini AI nodes.

## Tech Stack

- **Next.js 16** (App Router) + TypeScript (strict)
- **React Flow** (`@xyflow/react`) for the canvas
- **Clerk** for authentication
- **PostgreSQL** (Neon) + **Prisma** for persistence
- **Trigger.dev** for node execution (Crop Image, Gemini)
- **Google Gemini** (`@google/generative-ai`) for LLM
- **Transloadit** for image uploads
- **FFmpeg** for image cropping
- **Zustand** for canvas state, **Zod** for validation

## Getting Started

### 1. Clone and install

```bash
npm install
```

### 2. Configure environment

Copy `.env.example` to `.env.local` and fill in all values:

```bash
cp .env.example .env.local
```

| Variable | Source |
|---|---|
| `DATABASE_URL` | [Neon](https://neon.tech) |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` / `CLERK_SECRET_KEY` | [Clerk](https://clerk.com) |
| `GOOGLE_GENERATIVE_AI_API_KEY` | [Google AI Studio](https://aistudio.google.com) |
| `TRIGGER_SECRET_KEY` / `TRIGGER_PROJECT_REF` | [Trigger.dev](https://trigger.dev) |
| `TRANSLOADIT_AUTH_KEY` / `TRANSLOADIT_AUTH_SECRET` | [Transloadit](https://transloadit.com) |
| `NEXT_PUBLIC_CANDIDATE_LINKEDIN` | Your LinkedIn profile URL |

### 3. Set up the database

```bash
npm run db:push
```

### 4. Run Trigger.dev (separate terminal)

```bash
npm run trigger:dev
```

### 5. Start the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — unauthenticated users are redirected to Clerk sign-in.

## Pages

| Route | Description |
|---|---|
| `/sign-in` | Clerk sign-in |
| `/sign-up` | Clerk sign-up |
| `/dashboard` | Workflow list (CRUD) |
| `/workflow/[id]` | Workflow canvas |

## Node Types

| Node | Executable | Description |
|---|---|---|
| **Request Inputs** | No | Configurable text/image input fields |
| **Crop Image** | Yes (Trigger.dev + FFmpeg, 30s+ delay) | Crop images by percentage |
| **Gemini 3.1 Pro** | Yes (Trigger.dev + Gemini API) | LLM text/vision generation |
| **Response** | No | Collects final workflow output |

## Sample Workflow

Click **Sample Workflow** on the dashboard to create the pre-built marketing pipeline:

```
Request Inputs
├── Crop Image #1
├── Crop Image #2
└── Gemini #1 → Gemini #2
                    ↓
Crop #1 + Crop #2 + Gemini #2 → Final Gemini → Response
```

## Execution Modes

- **Run All** — Full DAG execution with parallel independent nodes
- **Run Selected** — Single or multi-select node execution
- **History sidebar** — Run-level and node-level execution details

## Scripts

```bash
npm run dev          # Start Next.js dev server
npm run build        # Production build
npm run trigger:dev  # Start Trigger.dev worker
npm run db:push      # Push Prisma schema to database
npm run db:studio    # Open Prisma Studio
```

## Deployment (Vercel)

1. Push to GitHub (grant access to `bluerocketinfo@gmail.com`)
2. Import project in [Vercel](https://vercel.com)
3. Add all environment variables from `.env.example`
4. Connect Trigger.dev via Vercel integration or deploy tasks with `npx trigger.dev@latest deploy`
5. Ensure FFmpeg is available in the Trigger.dev runtime for crop tasks

## Requirements

- **FFmpeg** must be installed on the Trigger.dev worker machine for Crop Image nodes
- Crop Image intentionally waits **30+ seconds** before returning output
- Console log on page load: `[NextFlow] Candidate LinkedIn: <url>`
# next-flow
