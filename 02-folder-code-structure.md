# Project Tracker — Developer Folder & Code Structure

---

## Monorepo Root
```
project-tracker/
├── apps/
│   ├── web/                    ← Next.js 14 frontend
│   └── api/                    ← NestJS backend
├── packages/
│   └── shared/                 ← Shared TypeScript types, enums, utils
├── docker-compose.yml
├── docker-compose.prod.yml
├── .env.example
├── .gitignore
├── README.md
└── package.json                ← Turborepo / pnpm workspaces root
```

---

## Frontend — apps/web/
```
apps/web/
├── public/
│   └── logo.svg
├── src/
│   ├── app/                              ← Next.js App Router pages
│   │   ├── (auth)/
│   │   │   └── login/
│   │   │       └── page.tsx
│   │   ├── (app)/                        ← Protected layout
│   │   │   ├── layout.tsx                ← Sidebar + auth guard
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx              ← Team View + My Work tabs
│   │   │   ├── projects/
│   │   │   │   ├── page.tsx              ← Projects list
│   │   │   │   ├── new/
│   │   │   │   │   └── page.tsx          ← Create + assign project
│   │   │   │   └── [id]/
│   │   │   │       ├── page.tsx          ← Project detail (overview)
│   │   │   │       ├── layout.tsx        ← Project sub-nav
│   │   │   │       ├── tasks/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── gantt/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── kanban/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── links/
│   │   │   │       │   └── page.tsx
│   │   │   │       ├── time/
│   │   │   │       │   └── page.tsx
│   │   │   │       └── activity/
│   │   │   │           └── page.tsx
│   │   │   ├── my-work/
│   │   │   │   └── page.tsx              ← Personal tasks, my kanban, my gantt
│   │   │   ├── notifications/
│   │   │   │   └── page.tsx
│   │   │   └── reports/
│   │   │       ├── page.tsx
│   │   │       ├── project/[id]/
│   │   │       │   └── page.tsx
│   │   │       ├── team/
│   │   │       │   └── page.tsx
│   │   │       └── time/
│   │   │           └── page.tsx
│   │   ├── (admin)/                      ← Super Admin only
│   │   │   ├── layout.tsx                ← Admin auth guard
│   │   │   └── admin/
│   │   │       ├── users/
│   │   │       │   ├── page.tsx          ← User management table
│   │   │       │   └── [id]/
│   │   │       │       └── page.tsx
│   │   │       ├── org-chart/
│   │   │       │   └── page.tsx          ← Drag-and-drop hierarchy editor
│   │   │       ├── audit-logs/
│   │   │       │   └── page.tsx
│   │   │       └── settings/
│   │   │           └── page.tsx
│   │   └── layout.tsx                    ← Root layout (fonts, providers)
│   │
│   ├── components/
│   │   ├── ui/                           ← shadcn/ui base components
│   │   │   ├── button.tsx
│   │   │   ├── dialog.tsx
│   │   │   ├── dropdown-menu.tsx
│   │   │   ├── input.tsx
│   │   │   ├── select.tsx
│   │   │   ├── badge.tsx
│   │   │   ├── avatar.tsx
│   │   │   ├── tooltip.tsx
│   │   │   ├── popover.tsx
│   │   │   ├── sheet.tsx
│   │   │   └── tabs.tsx
│   │   │
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── TopBar.tsx
│   │   │   ├── NotificationBell.tsx
│   │   │   └── UserMenu.tsx
│   │   │
│   │   ├── dashboard/
│   │   │   ├── TeamView.tsx
│   │   │   ├── MyWork.tsx
│   │   │   ├── ProjectCard.tsx
│   │   │   ├── WorkloadChart.tsx
│   │   │   └── TeamMemberPanel.tsx
│   │   │
│   │   ├── projects/
│   │   │   ├── ProjectForm.tsx
│   │   │   ├── ProjectHeader.tsx
│   │   │   ├── ProjectStatusBadge.tsx
│   │   │   ├── ProjectAssigneeSelect.tsx  ← Renders org subtree for selection
│   │   │   └── ProjectTeamPanel.tsx
│   │   │
│   │   ├── tasks/
│   │   │   ├── TaskList.tsx
│   │   │   ├── TaskRow.tsx
│   │   │   ├── TaskDetail.tsx             ← Slide-over panel
│   │   │   ├── TaskForm.tsx
│   │   │   ├── SubtaskList.tsx
│   │   │   ├── TaskStatusSelect.tsx
│   │   │   └── TaskPriorityBadge.tsx
│   │   │
│   │   ├── gantt/
│   │   │   ├── GanttChart.tsx
│   │   │   ├── GanttToolbar.tsx          ← Zoom level, filters
│   │   │   └── GanttDependencyLayer.tsx
│   │   │
│   │   ├── kanban/
│   │   │   ├── KanbanBoard.tsx
│   │   │   ├── KanbanColumn.tsx
│   │   │   ├── KanbanCard.tsx
│   │   │   └── KanbanSwimlaneToggle.tsx
│   │   │
│   │   ├── time/
│   │   │   ├── TimeTracker.tsx           ← Start/stop timer widget
│   │   │   ├── TimeLogForm.tsx
│   │   │   ├── TimeLogList.tsx
│   │   │   └── Timesheet.tsx
│   │   │
│   │   ├── links/
│   │   │   ├── LinksPanel.tsx
│   │   │   ├── LinkForm.tsx
│   │   │   └── LinkItem.tsx
│   │   │
│   │   ├── comments/
│   │   │   ├── CommentThread.tsx
│   │   │   ├── CommentItem.tsx
│   │   │   ├── CommentEditor.tsx         ← Tiptap with @mention
│   │   │   └── EmojiReactionBar.tsx
│   │   │
│   │   ├── notifications/
│   │   │   ├── NotificationList.tsx
│   │   │   └── NotificationItem.tsx
│   │   │
│   │   ├── reports/
│   │   │   ├── ProjectStatusReport.tsx
│   │   │   ├── TeamProductivityReport.tsx
│   │   │   ├── TimeTrackingReport.tsx
│   │   │   └── ExportButton.tsx
│   │   │
│   │   ├── admin/
│   │   │   ├── UserTable.tsx
│   │   │   ├── UserForm.tsx
│   │   │   ├── OrgTreeEditor.tsx         ← Drag-and-drop org builder
│   │   │   ├── OrgTreeNode.tsx
│   │   │   └── AuditLogTable.tsx
│   │   │
│   │   └── shared/
│   │       ├── RichTextEditor.tsx        ← Tiptap wrapper
│   │       ├── DateRangePicker.tsx
│   │       ├── UserAvatar.tsx
│   │       ├── UserSelect.tsx
│   │       ├── EmptyState.tsx
│   │       ├── LoadingSpinner.tsx
│   │       ├── ConfirmDialog.tsx
│   │       └── PageHeader.tsx
│   │
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useProjects.ts
│   │   ├── useTasks.ts
│   │   ├── useTeam.ts
│   │   ├── useNotifications.ts
│   │   ├── useTimeLogs.ts
│   │   ├── useSocket.ts                  ← Socket.io connection hook
│   │   └── useWorkload.ts
│   │
│   ├── lib/
│   │   ├── api.ts                        ← Axios instance with interceptors
│   │   ├── auth.ts                       ← Token management
│   │   ├── socket.ts                     ← Socket.io client setup
│   │   ├── queryClient.ts                ← TanStack Query client
│   │   └── utils.ts                      ← cn(), formatDate(), etc.
│   │
│   ├── store/
│   │   ├── authStore.ts                  ← Zustand: user, token
│   │   ├── notificationStore.ts          ← Zustand: unread count
│   │   └── timerStore.ts                 ← Zustand: active timer state
│   │
│   ├── types/
│   │   └── index.ts                      ← Re-exports from shared package
│   │
│   └── styles/
│       └── globals.css
│
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
└── package.json
```

---

## Backend — apps/api/
```
apps/api/
├── src/
│   ├── main.ts                           ← Bootstrap, CORS, WebSocket adapter
│   ├── app.module.ts                     ← Root module
│   │
│   ├── config/
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── mail.config.ts
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts
│   │   └── prisma.service.ts
│   │
│   ├── auth/
│   │   ├── auth.module.ts
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── strategies/
│   │   │   ├── jwt.strategy.ts
│   │   │   └── jwt-refresh.strategy.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   └── roles.guard.ts
│   │   └── dto/
│   │       ├── login.dto.ts
│   │       └── refresh.dto.ts
│   │
│   ├── users/
│   │   ├── users.module.ts
│   │   ├── users.controller.ts
│   │   ├── users.service.ts
│   │   ├── hierarchy.service.ts          ← Materialized path logic
│   │   └── dto/
│   │       ├── create-user.dto.ts
│   │       └── update-user.dto.ts
│   │
│   ├── projects/
│   │   ├── projects.module.ts
│   │   ├── projects.controller.ts
│   │   ├── projects.service.ts
│   │   ├── visibility.service.ts         ← Computes project_visibility
│   │   └── dto/
│   │       ├── create-project.dto.ts
│   │       └── update-project.dto.ts
│   │
│   ├── tasks/
│   │   ├── tasks.module.ts
│   │   ├── tasks.controller.ts
│   │   ├── tasks.service.ts
│   │   └── dto/
│   │       ├── create-task.dto.ts
│   │       └── update-task.dto.ts
│   │
│   ├── time-logs/
│   │   ├── time-logs.module.ts
│   │   ├── time-logs.controller.ts
│   │   ├── time-logs.service.ts
│   │   └── dto/
│   │       └── create-time-log.dto.ts
│   │
│   ├── links/
│   │   ├── links.module.ts
│   │   ├── links.controller.ts
│   │   ├── links.service.ts
│   │   └── dto/
│   │       └── create-link.dto.ts
│   │
│   ├── comments/
│   │   ├── comments.module.ts
│   │   ├── comments.controller.ts
│   │   ├── comments.service.ts
│   │   └── dto/
│   │       └── create-comment.dto.ts
│   │
│   ├── notifications/
│   │   ├── notifications.module.ts
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts      ← Creates notifications + emits socket events
│   │   └── notifications.gateway.ts      ← Socket.io gateway
│   │
│   ├── reports/
│   │   ├── reports.module.ts
│   │   ├── reports.controller.ts
│   │   ├── reports.service.ts
│   │   └── exporters/
│   │       ├── pdf.exporter.ts           ← Puppeteer
│   │       └── csv.exporter.ts
│   │
│   ├── admin/
│   │   ├── admin.module.ts
│   │   ├── admin.controller.ts           ← Super Admin only routes
│   │   └── admin.service.ts
│   │
│   ├── jobs/                             ← BullMQ background jobs
│   │   ├── jobs.module.ts
│   │   ├── visibility.processor.ts       ← Recomputes project_visibility
│   │   ├── email.processor.ts            ← Sends notification emails
│   │   └── report.processor.ts           ← Generates + emails reports
│   │
│   └── common/
│       ├── decorators/
│       │   ├── current-user.decorator.ts
│       │   └── roles.decorator.ts
│       ├── guards/
│       │   └── project-access.guard.ts   ← Checks project_visibility
│       ├── interceptors/
│       │   └── audit-log.interceptor.ts
│       ├── pipes/
│       │   └── uuid-validation.pipe.ts
│       └── filters/
│           └── http-exception.filter.ts
│
├── prisma/
│   ├── schema.prisma                     ← Full Prisma schema
│   ├── migrations/                       ← Auto-generated migration files
│   └── seed.ts                           ← Seed: super admin + sample org
│
├── test/
│   ├── auth.e2e-spec.ts
│   ├── projects.e2e-spec.ts
│   └── visibility.e2e-spec.ts
│
├── Dockerfile
├── nest-cli.json
├── tsconfig.json
└── package.json
```

---

## Shared Package — packages/shared/
```
packages/shared/
├── src/
│   ├── types/
│   │   ├── user.types.ts
│   │   ├── project.types.ts
│   │   ├── task.types.ts
│   │   ├── notification.types.ts
│   │   └── report.types.ts
│   ├── enums/
│   │   ├── project-status.enum.ts
│   │   ├── task-status.enum.ts
│   │   ├── priority.enum.ts
│   │   ├── notification-type.enum.ts
│   │   └── visibility-reason.enum.ts
│   └── index.ts
├── tsconfig.json
└── package.json
```

---

## Prisma Schema — apps/api/prisma/schema.prisma
```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

enum Role {
  super_admin
  user
}

enum ProjectStatus {
  planning
  active
  on_hold
  completed
  cancelled
}

enum Priority {
  critical
  high
  medium
  low
}

enum TaskStatus {
  todo
  in_progress
  in_review
  blocked
  done
}

enum VisibilityReason {
  assignee
  ancestor
  co_assignee
}

enum EntityType {
  task
  project
}

enum NotificationType {
  task_assigned
  task_status_changed
  comment_added
  due_date_approaching
  task_overdue
  project_assigned
  mention
}

enum DependencyType {
  finish_to_start
  start_to_start
  finish_to_finish
}

model User {
  id            String    @id @default(uuid())
  name          String
  email         String    @unique
  passwordHash  String    @map("password_hash")
  avatarUrl     String?   @map("avatar_url")
  reportsTo     String?   @map("reports_to")
  path          String    @default("")
  depth         Int       @default(0)
  role          Role      @default(user)
  isActive      Boolean   @default(true) @map("is_active")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  manager                 User?               @relation("Hierarchy", fields: [reportsTo], references: [id])
  reports                 User[]              @relation("Hierarchy")
  projectsCreated         Project[]           @relation("ProjectCreator")
  projectAssignments      ProjectAssignment[] @relation("AssignedTo")
  projectsAssignedBy      ProjectAssignment[] @relation("AssignedBy")
  projectVisibility       ProjectVisibility[]
  tasksAssigned           Task[]              @relation("TaskAssignee")
  tasksCreated            Task[]              @relation("TaskCreator")
  timeLogs                TimeLog[]
  comments                Comment[]
  linksAdded              Link[]
  notifications           Notification[]

  @@index([path])
  @@index([reportsTo])
  @@map("users")
}

model Project {
  id          String        @id @default(uuid())
  title       String
  description String?
  createdBy   String        @map("created_by")
  status      ProjectStatus @default(planning)
  priority    Priority      @default(medium)
  startDate   DateTime?     @map("start_date") @db.Date
  dueDate     DateTime?     @map("due_date") @db.Date
  tags        String[]
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")

  creator     User                @relation("ProjectCreator", fields: [createdBy], references: [id])
  assignments ProjectAssignment[]
  visibility  ProjectVisibility[]
  tasks       Task[]

  @@map("projects")
}

model ProjectAssignment {
  id         String   @id @default(uuid())
  projectId  String   @map("project_id")
  assignedTo String   @map("assigned_to")
  assignedBy String   @map("assigned_by")
  createdAt  DateTime @default(now()) @map("created_at")

  project    Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  assignee   User    @relation("AssignedTo", fields: [assignedTo], references: [id])
  assigner   User    @relation("AssignedBy", fields: [assignedBy], references: [id])

  @@unique([projectId, assignedTo])
  @@index([projectId])
  @@index([assignedTo])
  @@map("project_assignments")
}

model ProjectVisibility {
  id        String           @id @default(uuid())
  projectId String           @map("project_id")
  userId    String           @map("user_id")
  reason    VisibilityReason
  createdAt DateTime         @default(now()) @map("created_at")

  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  user      User    @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([projectId, userId])
  @@index([userId])
  @@index([projectId])
  @@map("project_visibility")
}

model Task {
  id             String     @id @default(uuid())
  projectId      String     @map("project_id")
  parentTaskId   String?    @map("parent_task_id")
  title          String
  description    String?
  assigneeId     String?    @map("assignee_id")
  createdBy      String     @map("created_by")
  status         TaskStatus @default(todo)
  priority       Priority   @default(medium)
  startDate      DateTime?  @map("start_date") @db.Date
  dueDate        DateTime?  @map("due_date") @db.Date
  estimatedHours Decimal?   @map("estimated_hours") @db.Decimal(6, 2)
  position       Int        @default(0)
  path           String     @default("")
  createdAt      DateTime   @default(now()) @map("created_at")
  updatedAt      DateTime   @updatedAt @map("updated_at")

  project        Project          @relation(fields: [projectId], references: [id], onDelete: Cascade)
  parent         Task?            @relation("Subtasks", fields: [parentTaskId], references: [id], onDelete: Cascade)
  subtasks       Task[]           @relation("Subtasks")
  assignee       User?            @relation("TaskAssignee", fields: [assigneeId], references: [id])
  creator        User             @relation("TaskCreator", fields: [createdBy], references: [id])
  timeLogs       TimeLog[]
  dependsOn      TaskDependency[] @relation("DependentTask")
  dependedOnBy   TaskDependency[] @relation("DependencyTarget")

  @@index([projectId])
  @@index([assigneeId])
  @@index([parentTaskId])
  @@index([status])
  @@map("tasks")
}

model TaskDependency {
  id          String         @id @default(uuid())
  taskId      String         @map("task_id")
  dependsOn   String         @map("depends_on")
  type        DependencyType @default(finish_to_start)

  task        Task @relation("DependentTask", fields: [taskId], references: [id], onDelete: Cascade)
  dependency  Task @relation("DependencyTarget", fields: [dependsOn], references: [id], onDelete: Cascade)

  @@unique([taskId, dependsOn])
  @@map("task_dependencies")
}

model TimeLog {
  id        String   @id @default(uuid())
  taskId    String   @map("task_id")
  userId    String   @map("user_id")
  date      DateTime @db.Date
  hours     Decimal  @db.Decimal(5, 2)
  note      String?
  createdAt DateTime @default(now()) @map("created_at")

  task      Task @relation(fields: [taskId], references: [id], onDelete: Cascade)
  user      User @relation(fields: [userId], references: [id])

  @@index([taskId])
  @@index([userId, date])
  @@map("time_logs")
}

model Comment {
  id        String     @id @default(uuid())
  entityType EntityType @map("entity_type")
  entityId  String     @map("entity_id")
  authorId  String     @map("author_id")
  body      Json
  parentId  String?    @map("parent_id")
  isEdited  Boolean    @default(false) @map("is_edited")
  createdAt DateTime   @default(now()) @map("created_at")
  updatedAt DateTime   @updatedAt @map("updated_at")

  author    User      @relation(fields: [authorId], references: [id])
  parent    Comment?  @relation("CommentThread", fields: [parentId], references: [id], onDelete: Cascade)
  replies   Comment[] @relation("CommentThread")

  @@index([entityType, entityId])
  @@map("comments")
}

model Link {
  id         String     @id @default(uuid())
  entityType EntityType @map("entity_type")
  entityId   String     @map("entity_id")
  label      String?
  url        String
  addedBy    String     @map("added_by")
  createdAt  DateTime   @default(now()) @map("created_at")

  user       User @relation(fields: [addedBy], references: [id])

  @@index([entityType, entityId])
  @@map("links")
}

model Notification {
  id          String           @id @default(uuid())
  recipientId String           @map("recipient_id")
  type        NotificationType
  entityType  EntityType?      @map("entity_type")
  entityId    String?          @map("entity_id")
  message     String
  isRead      Boolean          @default(false) @map("is_read")
  createdAt   DateTime         @default(now()) @map("created_at")

  recipient   User @relation(fields: [recipientId], references: [id], onDelete: Cascade)

  @@index([recipientId, isRead])
  @@map("notifications")
}

model AuditLog {
  id         String   @id @default(uuid())
  actorId    String?  @map("actor_id")
  action     String
  entityType String?  @map("entity_type")
  entityId   String?  @map("entity_id")
  metadata   Json?
  createdAt  DateTime @default(now()) @map("created_at")

  @@index([actorId])
  @@index([createdAt(sort: Desc)])
  @@map("audit_logs")
}
```

---

## Docker Compose — docker-compose.yml
```yaml
version: '3.9'

services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: project_tracker
      POSTGRES_USER: pt_user
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"

  api:
    build:
      context: ./apps/api
      dockerfile: Dockerfile
    environment:
      DATABASE_URL: postgresql://pt_user:${DB_PASSWORD}@postgres:5432/project_tracker
      REDIS_URL: redis://redis:6379
      JWT_SECRET: ${JWT_SECRET}
      JWT_REFRESH_SECRET: ${JWT_REFRESH_SECRET}
      SMTP_HOST: ${SMTP_HOST}
      SMTP_PORT: ${SMTP_PORT}
      SMTP_USER: ${SMTP_USER}
      SMTP_PASS: ${SMTP_PASS}
      FRONTEND_URL: ${FRONTEND_URL}
    depends_on:
      - postgres
      - redis
    ports:
      - "3001:3001"

  web:
    build:
      context: ./apps/web
      dockerfile: Dockerfile
    environment:
      NEXT_PUBLIC_API_URL: ${API_URL}
      NEXT_PUBLIC_WS_URL: ${WS_URL}
    depends_on:
      - api
    ports:
      - "3000:3000"

volumes:
  postgres_data:
```

---

## Environment Variables — .env.example
```
# Database
DB_PASSWORD=your_secure_password
DATABASE_URL=postgresql://pt_user:your_secure_password@localhost:5432/project_tracker

# JWT
JWT_SECRET=your_jwt_secret_min_32_chars
JWT_REFRESH_SECRET=your_refresh_secret_min_32_chars
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# Redis (BullMQ)
REDIS_URL=redis://localhost:6379

# Email (SMTP)
SMTP_HOST=smtp.company.com
SMTP_PORT=587
SMTP_USER=noreply@company.com
SMTP_PASS=your_smtp_password
MAIL_FROM="Project Tracker <noreply@company.com>"

# App URLs
FRONTEND_URL=http://localhost:3000
API_URL=http://localhost:3001
WS_URL=ws://localhost:3001
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_WS_URL=ws://localhost:3001
```

---

## Key Service Implementations (Reference)

### hierarchy.service.ts — Core Logic
```typescript
// Compute materialized path when a user is created or moved
async setPath(userId: string, parentId: string | null): Promise<void> {
  if (!parentId) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { path: userId, depth: 0 }
    });
  } else {
    const parent = await this.prisma.user.findUnique({ where: { id: parentId } });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        path: `${parent.path}.${userId}`,
        depth: parent.depth + 1
      }
    });
  }
  // Update all descendants' paths recursively
  await this.recomputeDescendantPaths(userId);
}

// Get all ancestors of a user
async getAncestors(userId: string): Promise<User[]> {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  const ancestorIds = user.path.split('.').filter(id => id !== userId);
  return this.prisma.user.findMany({ where: { id: { in: ancestorIds } } });
}

// Get all descendants of a user
async getDescendants(userId: string): Promise<User[]> {
  const user = await this.prisma.user.findUnique({ where: { id: userId } });
  return this.prisma.user.findMany({
    where: { path: { startsWith: `${user.path}.` } }
  });
}
```

### visibility.service.ts — Core Logic
```typescript
// Called when a project is assigned to one or more users
async computeVisibility(projectId: string, assigneeIds: string[]): Promise<void> {
  // 1. Upsert assignees
  for (const assigneeId of assigneeIds) {
    await this.upsertVisibility(projectId, assigneeId, 'assignee');

    // 2. Walk ancestor chain and grant 'ancestor' visibility
    const ancestors = await this.hierarchyService.getAncestors(assigneeId);
    for (const ancestor of ancestors) {
      await this.upsertVisibility(projectId, ancestor.id, 'ancestor');
    }
  }

  // 3. Grant co_assignee visibility between all assignees
  for (const a of assigneeIds) {
    for (const b of assigneeIds) {
      if (a !== b) {
        await this.upsertVisibility(projectId, a, 'co_assignee');
      }
    }
  }
}

private async upsertVisibility(projectId: string, userId: string, reason: VisibilityReason) {
  await this.prisma.projectVisibility.upsert({
    where: { projectId_userId: { projectId, userId } },
    create: { projectId, userId, reason },
    update: {}  // Don't overwrite existing reason
  });
}
```

---

*Structure v2.0 — Link-only attachments, no file storage layer*
