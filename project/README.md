# EverFlow

EverFlow is a collaborative project-management application built with Next.js. It combines project membership, role-based permissions, Kanban boards, task relationships, team collaboration, calendar planning, analytics, and real-time updates in one workspace.

## Core features

- Clerk authentication with custom sign-in, sign-up, invitation, recovery, and verification flows
- Project creation, editing, lifecycle management, search, and pagination
- Owner, manager, and member project permissions enforced on the server
- Kanban columns with task creation, editing, archive, restore, and soft deletion
- Task priorities, assignees, labels, dependencies, comments, and activity history
- Single-task and multi-task drag-and-drop with optimistic commit and rollback
- Generated project teams, invitations, access roles, and descriptive team roles
- Calendar views for milestones, assigned tasks, and upcoming deadlines
- Workspace dashboard, project analytics, and personal notifications
- Pusher-powered board refreshes and notification events

## Permission model

Project membership is the authorization source. Clerk authenticates the user, while the local `project_members` record determines what the user can do.

| Capability | Owner | Manager | Member |
|---|:---:|:---:|:---:|
| View accessible projects | Yes | Yes | Yes |
| Edit tasks in an active project | Yes | Yes | Yes |
| Edit tasks in an inactive project | Yes | Yes | No |
| Manage board columns | Yes | Yes | No |
| Edit project details and status | Yes | Yes | No |
| Manage ordinary members | Yes | Yes | No |
| Promote or demote managers | Yes | No | No |
| Archive or delete a project | Yes | No | No |
| Edit a completed project board | No | No | No |

Authorization is checked by Server Actions and authenticated route handlers. Client state is never treated as permission evidence.

## Technology stack

- Next.js 16 App Router and React 19
- TypeScript
- Clerk authentication
- Neon PostgreSQL
- Drizzle ORM and Drizzle Kit
- Zod validation
- Zustand optimistic board state
- TanStack React Query
- Pusher Channels
- Tailwind CSS and React Aria/shadcn-style components
- Vitest, jsdom, and Testing Library
- Playwright and Clerk testing helpers
- Biome formatting and linting

## Project structure

```text
project/
├── .github/
│   └── workflows/              # CI and deployment workflows
├── actions/                    # Validated and authorized Server Actions
├── app/
│   ├── (auth)/                 # Public authentication routes
│   ├── (dashboard)/            # Protected application routes
│   └── api/                    # Authenticated APIs and webhooks
├── components/
│   ├── analytics/              # Analytics interface
│   ├── auth/                   # Authentication interface
│   ├── calendar/               # Calendar interface
│   ├── dashboard/              # Dashboard interface
│   ├── modals/                 # Feature dialogs
│   ├── projects/               # Project interface
│   ├── settings/               # Settings interface
│   ├── tasks/                  # Task interface
│   └── ui/                     # Shared UI primitives
├── drizzle/
│   └── meta/                   # Migration snapshots and journal
├── e2e/                        # Playwright tests and Clerk setup
├── hooks/                      # React Query and application hooks
├── lib/
│   ├── auth/                   # Authentication and user synchronization
│   ├── db/                     # Database schema, queries, and mutations
│   └── realtime/               # Pusher clients and event helpers
├── public/                     # Static public assets
├── scripts/                    # Database seed utilities
├── stores/                     # Zustand application state and tests
└── types/                      # Domain inputs, states, and view models
```

The tree intentionally focuses on parent folders and their immediate subfolders. Individual source/configuration files and generated paths are omitted.

## Prerequisites

- Node.js 20.9 or newer
- pnpm 10.10.0
- A Clerk development application
- A Neon or PostgreSQL database
- A Pusher Channels application for real-time synchronization

## Local setup

Run these commands from the `project/` directory.

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Copy the environment template:

   PowerShell:

   ```powershell
   Copy-Item .env.example .env.local
   ```

   macOS or Linux:

   ```bash
   cp .env.example .env.local
   ```

3. Configure `.env.local`:

   ```dotenv
   NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
   CLERK_SECRET_KEY=sk_test_...
   NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
   NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
   NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/dashboard
   NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/dashboard
   NEXT_PUBLIC_APP_URL=http://localhost:3000

   DATABASE_URL=postgresql://...

   PUSHER_APP_ID=...
   PUSHER_KEY=...
   PUSHER_SECRET=...
   PUSHER_CLUSTER=...
   ```

4. Apply the committed database migrations:

   ```bash
   pnpm exec drizzle-kit migrate
   ```

5. Seed the priority reference data:

   ```bash
   pnpm exec tsx scripts/seed.ts
   ```

6. Start the application:

   ```bash
   pnpm dev
   ```

7. Open [http://localhost:3000](http://localhost:3000).

Never commit `.env.local`, Clerk keys, database credentials, Pusher secrets, or Playwright authentication state.


## Application routes

| Route | Purpose |
|---|---|
| `/` | Redirects visitors according to authentication state |
| `/sign-in` and `/sign-up` | Custom Clerk authentication flows |
| `/dashboard` | Workspace overview and assigned work |
| `/projects` | Accessible projects, search, and pagination |
| `/projects/[slug]` | Authorized interactive Kanban board |
| `/team` and `/team/[teamId]` | Project teams, roles, members, and invitations |
| `/calendar` | Project milestones and task deadlines |
| `/analytics` | Authorized workspace and project analytics |
| `/settings` | Settings interface; some controls remain prototype-only |

## Data and mutation flow

```text
Browser or Server Component
        ↓
Server Action or authenticated route handler
        ↓
Zod validation
        ↓
Clerk authentication and project authorization
        ↓
Server-only Drizzle query or mutation
        ↓
Neon PostgreSQL
        ↓
Revalidation, cache refresh, or optimistic reconciliation
```

Neon is authoritative. React Query and Zustand provide cached or optimistic UI state only. An optimistic board change is committed after the Server Action succeeds and rolled back when it fails.

## The main table groups are:

- Identity: `users`, `webhook_events`
- Projects and access: `projects`, `project_members`, `project_invitations`
- Generated teams: `teams`, `team_roles`
- Kanban work: `lists`, `tasks`, `priority_options`, `labels`
- Task relationships: `task_assignees`, `task_labels`, `task_dependencies`
- Collaboration: `comments`, `task_activities`, `notifications`

## Deployment Link
everflow-workspace.vercel.app
