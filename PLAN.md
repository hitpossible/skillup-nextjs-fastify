# LMS Implementation Plan

> workflow: ตอบ "approve" เพื่อเริ่ม step แรก — จะทำทีละ step แล้วรอ confirm ก่อนไป step ถัดไป

---

## สถานะปัจจุบัน

Monorepo scaffold พร้อมแล้ว:
- `pnpm-workspace.yaml`, root `package.json`, base `tsconfig.json`
- `packages/db` — Prisma schema (21 tables) + singleton client
- `packages/shared` — types, constants, utils
- `apps/api` — Fastify skeleton + stub routes (ทุก route ยัง 501)
- `apps/web` — Next.js 14 App Router skeleton

---

## Phase 1 — Foundation

### Step 1 · `packages/db` — Prisma migration & seed

**ทำอะไร:** รัน `prisma migrate dev` สร้าง migration SQL จาก schema ที่มีอยู่ + สร้าง seed script

**ทำไม:** ทุก service layer ต้องการ DB schema จริงก่อน — ถ้า schema ไม่ตรง MySQL จะ runtime error

**ไฟล์ที่ต้องสร้าง:**
```
packages/db/prisma/seed.ts
packages/db/prisma/migrations/   ← auto-generated โดย prisma
```

**Output:** MySQL ที่ใช้งานได้ + Prisma Client generated + seed data สำหรับ dev

---

### Step 2 · `packages/shared` — Zod schemas

**ทำอะไร:** สร้าง Zod validation schemas สำหรับ request/response ทุก domain

**ทำไม:** `apps/api` และ `apps/web` ใช้ร่วมกัน — ต้องอยู่ใน `shared` ไม่ใช่แยกกันคนละที่

**ไฟล์ที่ต้องสร้าง:**
```
packages/shared/src/schemas/auth.ts
packages/shared/src/schemas/user.ts
packages/shared/src/schemas/course.ts
packages/shared/src/schemas/enrollment.ts
packages/shared/src/schemas/quiz.ts
packages/shared/src/schemas/index.ts
```

**Output:** Zod schemas ที่ share ได้ระหว่าง API validation และ web form validation

---

## Phase 2 — API Core

### Step 3 · `apps/api` — Infrastructure plugins

**ทำอะไร:** สร้าง Fastify plugins ที่ทุก route ต้องการ: Prisma plugin, error handler, request-id

**ทำไม:** route handlers ใช้ `request.server.prisma` — ต้อง decorate ก่อน register routes

**ไฟล์ที่ต้องสร้าง:**
```
apps/api/src/plugins/prisma.ts         ← fastify.decorate('prisma', client)
apps/api/src/plugins/error-handler.ts  ← format error → ApiError shape
apps/api/src/plugins/request-id.ts     ← inject request_id ทุก response
```

**Output:** `app.ts` register plugins ได้โดยไม่ error

---

### Step 4 · `apps/api` — Auth service + route

**ทำอะไร:** implement `POST /auth/login`, `POST /auth/refresh`, `DELETE /auth/logout` พร้อม bcrypt + JWT

**ทำไม:** ทุก route อื่นต้องการ JWT token ที่ valid — auth ต้อง work ก่อนทุก step

**ไฟล์ที่ต้องสร้าง:**
```
apps/api/src/services/auth-service.ts
apps/api/src/routes/auth.ts            ← แทน stub ที่มีอยู่
```

**Output:** `POST /api/v1/auth/login` คืน `accessToken` + `refreshToken` ได้จริง

---

### Step 5 · `apps/api` — User service + route

**ทำอะไร:** implement CRUD users พร้อม soft delete cascade (business rule #7)

**ทำไม:** enrollment ต้องการ userId จริง, auth ต้องการ user record

**ไฟล์ที่ต้องสร้าง:**
```
apps/api/src/services/user-service.ts
apps/api/src/controllers/user-controller.ts
apps/api/src/routes/users.ts           ← แทน stub
```

**Output:** CRUD users พร้อม tenant isolation + pagination `?page&limit`

---

### Step 6 · `apps/api` — Course service + route

**ทำอะไร:** implement courses CRUD + publish flow + sections + lessons

**ทำไม:** enrollment ต้องการ course ที่ `status = 'published'`

**ไฟล์ที่ต้องสร้าง:**
```
apps/api/src/services/course-service.ts
apps/api/src/controllers/course-controller.ts
apps/api/src/routes/courses.ts         ← แทน stub
apps/api/src/routes/sections.ts        ← GET/POST /courses/:id/sections
apps/api/src/routes/lessons.ts         ← GET/POST /sections/:id/lessons
```

**Output:** สร้าง course → add sections → add lessons → `PATCH /courses/:id/publish`

---

### Step 7 · `apps/api` — Enrollment + Certificate service

**ทำอะไร:** `POST /enrollments`, progress update, auto-complete (business rule #3 #4) → trigger certificate (business rule #5)

**ทำไม:** business rule ซับซ้อนและผูกกัน — enrollment complete → certificate ต้องทำพร้อมกัน

**ไฟล์ที่ต้องสร้าง:**
```
apps/api/src/services/enrollment-service.ts
apps/api/src/services/certificate-service.ts
apps/api/src/controllers/enrollment-controller.ts
apps/api/src/routes/enrollments.ts     ← แทน stub
apps/api/src/routes/certificates.ts   ← GET /users/:id/certificates, GET /certificates/verify/:number
```

**Output:** enroll → เรียน → progress 100% → `enrollments.status = 'completed'` → certificate ออกอัตโนมัติ

---

### Step 8 · `apps/api` — Quiz service + route

**ทำอะไร:** quiz attempts, max_attempts check (business rule #2), submit + auto-score

**ทำไม:** quiz เป็น standalone domain ไม่ block enrollment flow

**ไฟล์ที่ต้องสร้าง:**
```
apps/api/src/services/quiz-service.ts
apps/api/src/controllers/quiz-controller.ts
apps/api/src/routes/quizzes.ts         ← GET /quizzes/:id, POST /quizzes/:id/attempts
apps/api/src/routes/quiz-attempts.ts   ← POST /quiz-attempts/:id/submit
```

**Output:** start attempt → answer questions → submit → รับ score + pass/fail

---

### Step 9 · `apps/api` — Video questions route

**ทำอะไร:** in-video questions responses (ไม่มี max_attempts — business rule #6)

**ทำไม:** logic ต่างจาก quiz — user ตอบได้ทุกครั้งที่ดู video ซ้ำ

**ไฟล์ที่ต้องสร้าง:**
```
apps/api/src/services/video-question-service.ts
apps/api/src/routes/video-questions.ts ← GET /lessons/:id/video-questions, POST response
```

**Output:** user ตอบ in-video question ได้ไม่จำกัดครั้ง

---

### Step 10 · `apps/api` — Analytics routes

**ทำอะไร:** read-only aggregate queries สำหรับ admin dashboard

**ทำไม:** ทำสุดท้ายเพราะ aggregate ข้อมูลจากทุก table ก่อนหน้า

**ไฟล์ที่ต้องสร้าง:**
```
apps/api/src/services/analytics-service.ts
apps/api/src/routes/analytics.ts       ← GET /analytics/courses/:id, GET /analytics/users/:id/report
```

**Output:** course completion rate, avg score, active enrollments per course

---

## Phase 3 — Web Frontend

> ทำ parallel กับ Phase 2 Step 8-10 ได้ถ้ามี Step 4-7 พร้อมแล้ว

### Step 11 · `apps/web` — Auth pages + session

**ทำอะไร:** login page, JWT ใน httpOnly cookie, auth context, Next.js middleware redirect

**ไฟล์ที่ต้องสร้าง:**
```
apps/web/src/app/(auth)/login/page.tsx
apps/web/src/lib/auth.ts
apps/web/src/components/providers/auth-provider.tsx
apps/web/src/middleware.ts
```

---

### Step 12 · `apps/web` — Course catalog + enrollment

**ทำอะไร:** list courses, course detail, ปุ่ม enroll

**ไฟล์ที่ต้องสร้าง:**
```
apps/web/src/app/(app)/courses/page.tsx
apps/web/src/app/(app)/courses/[id]/page.tsx
apps/web/src/components/course-card.tsx
apps/web/src/components/enroll-button.tsx
```

---

### Step 13 · `apps/web` — Lesson player

**ทำอะไร:** video player + progress tracking + in-video question overlay + text lesson

**ไฟล์ที่ต้องสร้าง:**
```
apps/web/src/app/(app)/courses/[id]/lessons/[lessonId]/page.tsx
apps/web/src/components/video-player.tsx
apps/web/src/components/video-question-overlay.tsx
apps/web/src/components/lesson-content.tsx
```

---

### Step 14 · `apps/web` — Quiz UI

**ทำอะไร:** quiz attempt flow, countdown timer (ถ้า time_limit), result page

**ไฟล์ที่ต้องสร้าง:**
```
apps/web/src/app/(app)/quiz/[attemptId]/page.tsx
apps/web/src/components/quiz-question.tsx
apps/web/src/components/quiz-result.tsx
```

---

### Step 15 · `apps/web` — My learning + certificate

**ทำอะไร:** dashboard user (enrolled courses + progress bar), certificate list + download, public verify page

**ไฟล์ที่ต้องสร้าง:**
```
apps/web/src/app/(app)/my-learning/page.tsx
apps/web/src/app/(app)/certificates/page.tsx
apps/web/src/app/certificates/verify/[number]/page.tsx
apps/web/src/components/certificate-card.tsx
```

---

## Dependency chain

```
Step 1 (DB migrate)
  └── Step 2 (Shared Zod schemas)
        └── Step 3 (API plugins)
              ├── Step 4 (Auth)  ←─────────────── ต้องก่อนทุก step
              ├── Step 5 (Users)
              ├── Step 6 (Courses)
              │     └── Step 7 (Enrollments + Certificates)
              ├── Step 8 (Quiz)
              ├── Step 9 (Video questions)
              └── Step 10 (Analytics)

Steps 4-6 done → Step 11 (Web: Auth)
Step 7 done    → Steps 12-13 (Web: Catalog + Player)
Step 8 done    → Step 14 (Web: Quiz UI)
Step 7 done    → Step 15 (Web: My Learning + Cert)
```

---