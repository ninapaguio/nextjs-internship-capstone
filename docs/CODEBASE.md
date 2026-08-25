# DATA ARCHITECTURE 

## Data Flows:

1. User identy and Application profile - Authentication and session state are hand off to Clerk, while application-level user profiles and soft-delete states are synchronized to the local users table via webhook_events which running it again won't change anything unless there is changes.

2. ROLE Access
- Access Role (project_access_role): authorization (owner, manager, member) controlling mutations, project deletion, and member governance. Exactly one active owner per project is strictly enforced via partial unique indexing.
- Team Role (team_roles): Functional titles (e.g., "Frontend Lead", "QA Specialist") that assigned to each member.

  | Operation | Owner | Manager | Member |
  |---|:---:|:---:|:---:|
  | View active accessible project/team | Yes | Yes | Yes |
  | Edit planned tasks | Yes | Yes | No |
  | Edit active tasks/comments/labels | Yes | Yes | Yes |
  | Edit completed board | No | No | No |
  | Manage columns | Yes | Yes | No |
  | Edit project details/status | Yes | Yes | No |
  | Archive/delete project | Yes | No | No |
  | Invite/cancel invitations | Yes | Yes | No |
  | Manage/assign descriptive team roles | Yes | Yes | No |
  | Promote/demote managers | Yes | No | No |
  | Remove regular member | Yes | Yes | No |
  | Remove manager | Yes | No | No |
  | Remove owner | No | No | No |

## The main table groups are:

- Identity: `users`, `webhook_events`
- Projects and access: `projects`, `project_members`, `project_invitations`
- Generated teams: `teams`, `team_roles`
- Kanban work: `lists`, `tasks`, `priority_options`, `labels`
- Task relationships: `task_assignees`, `task_labels`, `task_dependencies`
- Collaboration: `comments`, `task_activities`, `notifications`

## Architectural Shape:
```text
Browser
  ├─ App Router Server Components
  ├─ focused Client Components
  ├─ React Query: project/comment/activity/notification caches
  ├─ Zustand: Kanban and shell UI state
  ├─ Pusher: private project-board and personal notification events
  └─ Clerk browser/session components
             │
             ├─ Server Actions: application mutations
             └─ authenticated GET route handlers
                         │
                  Zod validation
                         │
              authentication + authorization
                         │
             server-only query/mutation modules
                         │
        Drizzle ORM + Neon HTTP PostgreSQL driver
                         │
                    PostgreSQL
```

## ERD
``` mermaid 
erDiagram
  USERS ||--o{ PROJECTS : creates
  USERS ||--o{ TEAM_ROLES : creates
  USERS ||--o{ PROJECT_MEMBERS : "is member"
  USERS ||--o{ PROJECT_MEMBERS : adds
  USERS ||--o{ PROJECT_INVITATIONS : invites
  USERS ||--o{ TASKS : creates
  USERS ||--o{ TASK_ASSIGNEES : "is assigned"
  USERS ||--o{ TASK_ASSIGNEES : assigns
  USERS ||--o{ TASK_DEPENDENCIES : creates
  USERS ||--o{ COMMENTS : writes
  USERS ||--o{ TASK_ACTIVITIES : performs
  USERS ||--o{ NOTIFICATIONS : receives
  USERS ||--o{ NOTIFICATIONS : triggers
 
  PROJECTS ||--|| TEAMS : owns
  PROJECTS ||--o{ PROJECT_MEMBERS : has
  PROJECTS ||--o{ PROJECT_INVITATIONS : sends
  PROJECTS ||--o{ LISTS : contains
  PROJECTS ||--o{ LABELS : contains
  PROJECTS ||--o{ TASKS : contains
  PROJECTS ||--o{ TASK_LABELS : scopes
  PROJECTS ||--o{ TASK_DEPENDENCIES : scopes
  PROJECTS ||--o{ NOTIFICATIONS : concerns
 
  TEAMS ||--o{ TEAM_ROLES : defines
  TEAM_ROLES |o--o{ PROJECT_MEMBERS : "assigns title"
 
  LISTS ||--o{ TASKS : contains
  PRIORITY_OPTIONS ||--o{ TASKS : ranks
 
  TASKS ||--o{ TASK_ASSIGNEES : has
  TASKS ||--o{ TASK_LABELS : tagged
  TASKS ||--o{ TASK_DEPENDENCIES : blocks
  TASKS ||--o{ TASK_DEPENDENCIES : "blocked by"
  TASKS ||--o{ COMMENTS : has
  TASKS ||--o{ TASK_ACTIVITIES : logs
  TASKS ||--o{ NOTIFICATIONS : concerns
 
  LABELS ||--o{ TASK_LABELS : applied
 
  USERS {
    uuid id PK
    string clerk_id UK
    string email UK
    string username
    string first_name
    string last_name
    string image_url
    timestamp deleted_at
  }
 
  PROJECTS {
    uuid id PK
    uuid created_by_id FK
    string name
    string description
    date start_date
    date end_date
    string status
    int board_version
    timestamp archived_at
    timestamp deleted_at
  }
 
  TEAMS {
    uuid id PK
    uuid project_id "FK, UK"
    string status
  }
 
  TEAM_ROLES {
    uuid id PK
    uuid team_id FK
    string name
    uuid created_by_id FK
  }
 
  PROJECT_MEMBERS {
    uuid project_id "PK, FK"
    uuid user_id "PK, FK"
    string access_role
    uuid assigned_role_id FK
    uuid added_by_id FK
  }
 
  PROJECT_INVITATIONS {
    uuid id PK
    uuid project_id FK
    string clerk_invitation_id UK
    string email
    uuid invited_by_id FK
    string status
  }
 
  LISTS {
    uuid id PK
    uuid project_id FK
    string name
    int position
    string status
  }
 
  PRIORITY_OPTIONS {
    uuid id PK
    string key UK
    int sort_order UK
  }
 
  LABELS {
    uuid id PK
    uuid project_id FK
    string name
    string color
  }
 
  TASKS {
    uuid id PK
    uuid project_id FK
    uuid list_id FK
    uuid priority_id FK
    uuid created_by_id FK
    string title
    date due_date
    int position
    timestamp completed_at
    timestamp deleted_at
  }
 
  TASK_ASSIGNEES {
    uuid task_id "PK, FK"
    uuid user_id "PK, FK"
    uuid assigned_by_id FK
  }
 
  TASK_LABELS {
    uuid task_id "PK, FK"
    uuid label_id "PK, FK"
    uuid project_id FK
  }
 
  TASK_DEPENDENCIES {
    uuid task_id "PK, FK"
    uuid depends_on_task_id "PK, FK"
    uuid project_id FK
    uuid created_by_id FK
  }
 
  COMMENTS {
    uuid id PK
    uuid task_id FK
    uuid author_id FK
    string content
    timestamp deleted_at
  }
 
  TASK_ACTIVITIES {
    uuid id PK
    uuid task_id FK
    uuid actor_id FK
    string action
    string field_name
    json old_value
    json new_value
  }
 
  NOTIFICATIONS {
    uuid id PK
    uuid recipient_id FK
    uuid actor_id FK
    uuid project_id FK
    uuid task_id FK
    string type
    timestamp read_at
  }
```
# Technology stack and actual versions

Resolved versions come from `project/pnpm-lock.yaml`.

| Technology | Version | Current responsibility |
|---|---:|---|
| Next.js | 16.3.2 | App Router, Server Components/Actions, route handlers, metadata, cache revalidation, proxy. |
| React / React DOM | 19.2.8 | UI; forms use `useActionState` and `useFormStatus`. |
| TypeScript | 5.9.3 | Strict, no-emit, bundler resolution, `@/*` alias to `project/*`. |
| Clerk Next.js | 7.6.3 | Auth UI/session, invitation API, webhook verification, profile sync. |
| Drizzle ORM / Kit | 0.45.2 / 0.31.10 | Typed schema, reads/writes, generated PostgreSQL migrations. |
| Neon serverless | 1.1.0 | Server-only HTTP PostgreSQL connection. Database server version is **not determined from the current implementation.** |
| Zod | 4.4.3 | Runtime validation and normalization. |
| Zustand | 5.0.14 | Active board optimism and shell UI state. `use-tasks.ts` remains an unused placeholder. |
| TanStack React Query | 5.101.4 | Project list refresh/optimism; lazy comments/activity and infinite notification caches. |
| Pusher / Pusher JS | 5.3.4 / 8.6.0 | Serverless board and personal notification broadcasts over authenticated private channels. |
| `@dnd-kit/react` | 0.5.0 | Task drag/drop, multi-select moves, overlays, drop targets. |
| Tailwind CSS | 4.3.3 | PostCSS, CSS tokens, and utilities. |
| shadcn | 4.16.1 | UI scaffolding; active primitives are under `components/ui/`. |
| React Aria Components | 1.20.0 | Accessible input/selection/overlay primitives. |
| next-themes / Sonner | 0.4.6 / 2.0.8 | Theme state and toast feedback. |
| Lucide React | 0.454.0 | Icons. |
| Biome | 2.5.6 | Formatter, linter, import organizer. |
| Vitest / jsdom | 2.1.9 / 30.0.1 | Unit/component tests. |
| Testing Library | React 16.3.2, DOM 10.4.1 | Component/hook tests. |
| Playwright | 1.62.1 | E2E runner; current coverage is limited to auth boundaries. |