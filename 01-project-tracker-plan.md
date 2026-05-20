# Project Tracker — Complete Application Plan (v2.0)
> Internal Team Tool | Dynamic Hierarchy | Role-Based Visibility | Link-Based Attachments

---

## 1. Product Understanding

A hierarchical, internal project tracker for a single company operating with a dynamically configurable org tree (N levels deep). Projects flow top-down — anyone above an assignee in the chain gains automatic read visibility into that project. Each user's dashboard is split into two sections: **Team View** (projects flowing through their subtree) and **My Work** (personal tasks). Features include Gantt, Kanban, workload charts, time tracking, notifications, comments, link-based attachments, and reporting.

---

## 2. Core Concepts & Mental Model

### Hierarchy Model
```
Super Admin (system-level, not part of the project tree)
    └── Team Head (Level 1)
            └── Manager (Level 2)
                    └── Senior (Level 3)
                            └── Employee (Level 4)
                                    └── Junior (Level 5)
                                            └── ... (N levels, configurable)
```
- Stored as **adjacency list + materialized path** on the `users` table
- No fixed level cap — hierarchy depth is dynamic
- A node can have multiple children (one-to-many)
- A node has exactly one parent (except the root)

### Project Visibility Logic
```
When User X assigns a project to User Y (skip-level allowed):
  ✅ User Y sees the project (assignee)
  ✅ Every ancestor of Y up to X sees the project (chain of managers)
  ✅ Any co-assignee on the same project sees the full project
  ❌ Peers NOT assigned to the project cannot see it
  ❌ Anyone below Y cannot see it

Inside the project, a user can see:
  ✅ Their own tasks and subtasks
  ✅ Tasks of all co-assignees in the same project
  ✅ Tasks of their skip-level managers within the project
  ✅ Tasks of anyone they manage who is in the project
  ❌ Tasks of unrelated users not in the project
```

---

## 3. User Roles

| Role | Scope | Capabilities |
|---|---|---|
| **Super Admin** | System-wide | Manages users, org structure, global settings, audit logs |
| **Node User** | Contextual | Assigns projects down the tree, views projects in their subtree |
| **Project Assignee** | Per-project | Creates and manages tasks, subtasks, time logs, links, comments |
| **Observer** | Per-project (auto) | Read + comment access, granted automatically to all ancestors |

> A single user can simultaneously be Observer on their reports' projects and Assignee on their own. Roles are project-scoped, not global.

---

## 4. Feature Breakdown

### 4.1 Super Admin Panel
- Create / edit / deactivate users
- Org tree builder with drag-and-drop (set `reports_to` per user)
- View full org chart (visual tree)
- Audit log of all admin actions
- Global notification preferences

### 4.2 Dashboard — Two Sections

**Section A: Team View** (for users who have reports)
- Active project cards across their subtree
- Gantt chart — timeline of all visible projects + tasks
- Kanban board — all tasks across visible projects (swimlaned by project or assignee)
- Workload chart — load per person (task count, hours, overdue)
- Team member panel — click any report → see their projects + task status
- Click any project card → opens Project Detail

**Section B: My Work** (everyone)
- My assigned tasks across all projects
- Personal Kanban board
- Personal Gantt / timeline
- My time logs (this week / month)
- Upcoming deadlines widget
- Notifications inbox

### 4.3 Project Module

| Field | Details |
|---|---|
| Title | Project name |
| Description | Rich text |
| Assigned To | One or more users (any level below assigner) |
| Assigned By | Auto-filled |
| Status | Planning / Active / On Hold / Completed / Cancelled |
| Priority | Critical / High / Medium / Low |
| Start Date / Due Date | Date range |
| Tags | Custom labels |
| Visibility | Auto-computed from hierarchy |

**Inside a Project:**
- Task list (nested subtasks, unlimited depth)
- Gantt view
- Kanban view
- Links panel (project-level external links)
- Comments / discussion thread
- Activity log
- Team panel (who has access and why)
- Time report

### 4.4 Task Module

| Field | Details |
|---|---|
| Title | Task name |
| Description | Rich text |
| Assignee | Within project visibility scope |
| Status | To Do / In Progress / In Review / Blocked / Done |
| Priority | Critical / High / Medium / Low |
| Start / Due Date | Date range |
| Estimated Hours | Number |
| Logged Hours | Auto-summed from time logs |
| Subtasks | Nested, unlimited depth |
| Links | Optional external URLs with labels |
| Comments | Threaded discussion |
| Activity | Full history |

### 4.5 Gantt Chart
- Timeline across Day / Week / Month / Quarter zoom levels
- Drag to reschedule tasks
- Task dependency links (Finish-to-Start, Start-to-Start)
- Critical path highlighting
- Color-coded by status or assignee
- Baseline comparison (planned vs actual)

### 4.6 Kanban Board
- Columns: To Do → In Progress → In Review → Blocked → Done
- Drag-and-drop cards between columns
- Card shows: assignee avatar, due date, priority badge, subtask count, time logged
- Swimlane modes: By Project / By Assignee / By Priority
- Filters: person, project, tag, due date, priority

### 4.7 Workload / Load Per Person
- Horizontal bar chart per visible team member
- Metrics: task count, estimated hours, logged hours, overdue count
- Color bands: Underloaded / Balanced / Overloaded
- Click any person → task breakdown modal
- Date range filter: This Week / This Month / Custom

### 4.8 Time Tracking
- Start/stop timer on any task
- Manual log entry: date, hours, note
- Weekly timesheet view per user
- Time visible at task level, project level, and dashboard
- Export to CSV / PDF

### 4.9 Links Panel (Replaces Drive/File System)
- Add external links to any project or task (optional)
- Each link has: URL + optional label (e.g. "Figma Design", "Google Doc", "GitHub PR")
- Links listed in a clean panel on both project and task detail pages
- Edit / delete own links
- No file uploads, no storage — fully external reference system

### 4.10 Notifications & Alerts
- In-app notification center (real-time via WebSocket)
- Email notifications (configurable per user)
- Triggers: task assigned, status changed, comment added, due date approaching (48h warning), task overdue, project assigned, @mention
- Digest mode: daily or weekly email summary option
- Mark as read / mark all as read

### 4.11 Comments & Discussion
- Threaded comments on tasks and projects
- `@mention` support (triggers notification)
- Emoji reactions
- Edit / delete own comments
- Inline link sharing in comments
- Activity feed separates system events from comments

### 4.12 Reporting & Exports
- **Project Status Report** — progress, tasks by status, overdue count, time logged
- **Team Productivity Report** — tasks completed, hours logged per person, over a date range
- **Workload History** — team load over time
- **Time Tracking Report** — by project / by person / by date range
- Export formats: PDF, CSV, Excel
- Scheduled report delivery via email (daily / weekly / monthly)

---

## 5. Tech Stack

### Frontend
| Layer | Technology | Reason |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR for dashboard, API routes, file-based routing |
| Language | TypeScript | Type safety for complex permission model |
| Styling | Tailwind CSS | Consistent, fast UI development |
| UI Components | shadcn/ui | Accessible, customizable base components |
| Charts | Recharts | Workload bars, time charts |
| Gantt | react-gantt-task | Purpose-built Gantt with drag support |
| Kanban | dnd-kit | Lightweight drag-and-drop |
| State | Zustand | Lightweight global state |
| Data Fetching | TanStack Query | Caching, background refresh, optimistic updates |
| Rich Text | Tiptap | Task descriptions, comments |

### Backend
| Layer | Technology | Reason |
|---|---|---|
| Runtime | Node.js | Unified JS/TS ecosystem |
| Framework | NestJS | Modular, guards/interceptors for permission middleware |
| ORM | Prisma | Type-safe, schema-first, easy migrations |
| Auth | JWT + Refresh Tokens | Stateless, secure |
| Real-time | Socket.io | Live notifications, task status updates |
| Queue | BullMQ | Async email notifications, report generation |
| Search | PostgreSQL Full-Text | Sufficient for internal tool scale |

### Database
**PostgreSQL 15** — Relational model fits hierarchy + permissions + project/task structure. Recursive CTEs for org chart. Materialized path for fast ancestor lookups.

### Infrastructure
| Layer | Technology |
|---|---|
| Containerization | Docker + Docker Compose |
| Reverse Proxy | Nginx |
| Database | PostgreSQL 15 (containerized) |
| Email | SMTP (company mail server) |
| Process | PM2 inside Docker |

> No file storage layer needed — link-only attachment system eliminates S3/MinIO entirely.

---

## 6. Database Schema

### users
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
name            VARCHAR(255) NOT NULL
email           VARCHAR(255) UNIQUE NOT NULL
password_hash   TEXT NOT NULL
avatar_url      TEXT
reports_to      UUID REFERENCES users(id) ON DELETE SET NULL
path            TEXT NOT NULL DEFAULT ''   -- materialized path e.g. "abc.def.ghi"
depth           INT NOT NULL DEFAULT 0
role            ENUM('super_admin', 'user') DEFAULT 'user'
is_active       BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()

INDEX: users_path_idx ON users(path)
INDEX: users_reports_to_idx ON users(reports_to)
```

### projects
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
title           VARCHAR(500) NOT NULL
description     TEXT
created_by      UUID NOT NULL REFERENCES users(id)
status          ENUM('planning','active','on_hold','completed','cancelled') DEFAULT 'planning'
priority        ENUM('critical','high','medium','low') DEFAULT 'medium'
start_date      DATE
due_date        DATE
tags            TEXT[]
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()
```

### project_assignments
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
assigned_to     UUID NOT NULL REFERENCES users(id)
assigned_by     UUID NOT NULL REFERENCES users(id)
created_at      TIMESTAMPTZ DEFAULT now()

UNIQUE(project_id, assigned_to)
INDEX: pa_project_idx ON project_assignments(project_id)
INDEX: pa_user_idx ON project_assignments(assigned_to)
```

### project_visibility  ← pre-computed permission cache
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
reason          ENUM('assignee', 'ancestor', 'co_assignee')
created_at      TIMESTAMPTZ DEFAULT now()

UNIQUE(project_id, user_id)
INDEX: pv_user_idx ON project_visibility(user_id)
INDEX: pv_project_idx ON project_visibility(project_id)
```

### tasks
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
project_id      UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE
parent_task_id  UUID REFERENCES tasks(id) ON DELETE CASCADE  -- null = root task
title           VARCHAR(500) NOT NULL
description     TEXT
assignee_id     UUID REFERENCES users(id) ON DELETE SET NULL
created_by      UUID NOT NULL REFERENCES users(id)
status          ENUM('todo','in_progress','in_review','blocked','done') DEFAULT 'todo'
priority        ENUM('critical','high','medium','low') DEFAULT 'medium'
start_date      DATE
due_date        DATE
estimated_hours DECIMAL(6,2)
position        INT DEFAULT 0    -- ordering within parent
path            TEXT             -- materialized path for subtask tree
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()

INDEX: tasks_project_idx ON tasks(project_id)
INDEX: tasks_assignee_idx ON tasks(assignee_id)
INDEX: tasks_parent_idx ON tasks(parent_task_id)
INDEX: tasks_status_idx ON tasks(status)
```

### task_dependencies
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
depends_on      UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
type            ENUM('finish_to_start','start_to_start','finish_to_finish') DEFAULT 'finish_to_start'

UNIQUE(task_id, depends_on)
```

### time_logs
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
task_id         UUID NOT NULL REFERENCES tasks(id) ON DELETE CASCADE
user_id         UUID NOT NULL REFERENCES users(id)
date            DATE NOT NULL
hours           DECIMAL(5,2) NOT NULL
note            TEXT
created_at      TIMESTAMPTZ DEFAULT now()

INDEX: tl_task_idx ON time_logs(task_id)
INDEX: tl_user_date_idx ON time_logs(user_id, date)
```

### comments
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
entity_type     ENUM('task', 'project') NOT NULL
entity_id       UUID NOT NULL
author_id       UUID NOT NULL REFERENCES users(id)
body            JSONB NOT NULL    -- Tiptap JSON
parent_id       UUID REFERENCES comments(id) ON DELETE CASCADE
is_edited       BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ DEFAULT now()
updated_at      TIMESTAMPTZ DEFAULT now()

INDEX: comments_entity_idx ON comments(entity_type, entity_id)
```

### links  ← replaces files/drive entirely
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
entity_type     ENUM('task', 'project') NOT NULL
entity_id       UUID NOT NULL
label           VARCHAR(255)     -- optional display name e.g. "Figma Design"
url             TEXT NOT NULL
added_by        UUID NOT NULL REFERENCES users(id)
created_at      TIMESTAMPTZ DEFAULT now()

INDEX: links_entity_idx ON links(entity_type, entity_id)
```

### notifications
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
recipient_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE
type            ENUM('task_assigned','task_status_changed','comment_added',
                     'due_date_approaching','task_overdue','project_assigned','mention')
entity_type     ENUM('task','project')
entity_id       UUID
message         TEXT
is_read         BOOLEAN DEFAULT false
created_at      TIMESTAMPTZ DEFAULT now()

INDEX: notif_recipient_idx ON notifications(recipient_id, is_read)
```

### audit_logs  ← Super Admin only
```sql
id              UUID PRIMARY KEY DEFAULT gen_random_uuid()
actor_id        UUID REFERENCES users(id)
action          VARCHAR(255) NOT NULL    -- e.g. "user.created", "hierarchy.updated"
entity_type     VARCHAR(100)
entity_id       UUID
metadata        JSONB
created_at      TIMESTAMPTZ DEFAULT now()

INDEX: al_actor_idx ON audit_logs(actor_id)
INDEX: al_created_idx ON audit_logs(created_at DESC)
```

---

## 7. Permission System — How It Works

### Materialized Path
Every user gets a `path` column: a dot-separated string of user IDs from root to themselves.
```
Team Head (id: AAA)     → path: "AAA"
Manager   (id: BBB)     → path: "AAA.BBB"
Senior    (id: CCC)     → path: "AAA.BBB.CCC"
Employee  (id: DDD)     → path: "AAA.BBB.CCC.DDD"
```

Queries:
```sql
-- Is X an ancestor of Y?
SELECT 1 WHERE Y.path LIKE X.path || '.%'

-- Get all descendants of X
SELECT * FROM users WHERE path LIKE X.path || '.%'

-- Get all ancestors of X
SELECT * FROM users WHERE X.path LIKE path || '.%' AND id != X.id
```

### Visibility Computation (on project assignment)
```
1. Project P is assigned to User Y by User X
2. Insert into project_assignments
3. Async job triggers:
   a. Insert (P, Y, 'assignee') into project_visibility
   b. Walk Y.path → insert every ancestor up to X as (P, ancestor, 'ancestor')
   c. For any existing assignees on P → insert (P, Y, 'co_assignee') and vice versa
4. Done — no recursive queries at request time
```

### API Guard (every request)
```sql
-- Can user U see project P?
SELECT 1 FROM project_visibility WHERE project_id = P AND user_id = U
-- Single indexed lookup — O(1)
```

---

## 8. API Structure

```
Auth
  POST   /auth/login
  POST   /auth/refresh
  POST   /auth/logout
  GET    /auth/me

Admin
  GET    /admin/users
  POST   /admin/users
  PATCH  /admin/users/:id
  DELETE /admin/users/:id          (soft deactivate)
  PATCH  /admin/users/:id/parent   (move in hierarchy)
  GET    /admin/org-chart
  GET    /admin/audit-logs

Users
  GET    /users/me
  PATCH  /users/me
  GET    /users/me/team            (my direct + indirect reports)
  GET    /users/:id/projects       (their visible projects)

Projects
  POST   /projects                 (create + assign)
  GET    /projects                 (my visible projects)
  GET    /projects/:id
  PATCH  /projects/:id
  GET    /projects/:id/tasks
  GET    /projects/:id/gantt
  GET    /projects/:id/kanban
  GET    /projects/:id/workload
  GET    /projects/:id/team
  GET    /projects/:id/time-report
  GET    /projects/:id/activity

Tasks
  POST   /projects/:id/tasks
  GET    /tasks/:id
  PATCH  /tasks/:id
  DELETE /tasks/:id
  POST   /tasks/:id/subtasks
  GET    /tasks/:id/subtasks
  GET    /tasks/:id/activity
  POST   /tasks/:id/dependencies
  DELETE /tasks/:id/dependencies/:depId

Time Logs
  POST   /tasks/:id/time-logs
  GET    /tasks/:id/time-logs
  PATCH  /time-logs/:id
  DELETE /time-logs/:id
  GET    /users/me/timesheet       (?week=2024-W20)

Links
  POST   /links                    (body: entity_type, entity_id, url, label)
  GET    /links?entity_type=&entity_id=
  PATCH  /links/:id
  DELETE /links/:id

Comments
  POST   /comments
  GET    /comments?entity_type=&entity_id=
  PATCH  /comments/:id
  DELETE /comments/:id

Notifications
  GET    /notifications
  PATCH  /notifications/:id/read
  POST   /notifications/read-all

Reports
  GET    /reports/project/:id
  GET    /reports/team-productivity
  GET    /reports/workload
  GET    /reports/time-tracking
  POST   /reports/export           (body: type, format, filters)
```

---

## 9. Development Roadmap

### Phase 1 — Foundation (Weeks 1–3)
- Monorepo setup (Next.js + NestJS + PostgreSQL + Docker)
- JWT authentication with refresh tokens
- Super Admin: user CRUD + org tree builder
- Materialized path system + hierarchy moves
- Visual org chart page

### Phase 2 — Projects & Visibility Engine (Weeks 4–6)
- Project creation + skip-level assignment
- `project_visibility` computation engine (BullMQ job)
- Project detail page
- Task creation, editing, subtask nesting
- Task-level and project-level links panel

### Phase 3 — Visualizations (Weeks 7–9)
- Gantt chart (project + personal) with drag + dependencies
- Kanban board with swimlanes + drag-and-drop
- Workload chart
- Dashboard: Team View + My Work sections fully wired

### Phase 4 — Time Tracking (Week 10)
- Timer on tasks (start/stop)
- Manual time log entry
- Timesheet view (personal)
- Time report on project detail

### Phase 5 — Notifications & Comments (Week 11)
- In-app notification center (Socket.io real-time)
- Email notifications via BullMQ + SMTP
- @mention system in Tiptap comments
- Comment threads on tasks and projects
- Emoji reactions

### Phase 6 — Reporting & Exports (Weeks 12–13)
- Report pages (project status, team productivity, time tracking, workload)
- PDF export (Puppeteer headless)
- CSV / Excel export
- Scheduled email delivery (BullMQ cron)

### Phase 7 — QA, Polish & Deployment (Weeks 14–15)
- End-to-end tests (Playwright)
- Mobile responsiveness pass
- Performance optimization (query analysis, TanStack Query tuning)
- Docker Compose production config
- Nginx + SSL setup
- Documentation handoff

---

## 10. Security

- All routes protected by JWT guard (NestJS)
- Every data query filtered through `project_visibility` — no direct ID access
- Hierarchy moves logged in audit_log
- Password hashing: bcrypt cost factor 12
- Rate limiting on `/auth/login` (5 req/min)
- Input sanitization on all Tiptap rich text (DOMPurify server-side)
- CORS locked to internal domain
- Super Admin actions double-confirmed in UI for destructive operations

---

## 11. Scalability Notes

This is a single-company internal tool. Realistic scale: 50–1000 users.

- Materialized path queries are index-backed — hierarchy lookups stay fast at any depth
- `project_visibility` pre-computation means permission checks at request time are O(1)
- BullMQ handles notification spikes without blocking the main thread
- If scale grows beyond 1000 users: add Redis caching on visibility lookups
- PostgreSQL connection pooling via PgBouncer if concurrent connections become a bottleneck

---

*Plan v2.0 — Link-only attachments, no file storage layer*
