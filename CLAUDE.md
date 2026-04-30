# CLAUDE.md — LMS Project

> อ่านไฟล์นี้ก่อนทุกครั้ง อย่า assume อะไรที่ไม่ได้เขียนไว้ที่นี่

---

## Project overview

ระบบ Learning Management System (LMS) สำหรับใช้ภายในองค์กร
รองรับ multi-tenant (หลายบริษัทใน DB เดียวกัน), video lessons พร้อม in-video questions,
quiz/assessment, certificate ออกอัตโนมัติ

---

## Tech stack

> อัพเดตส่วนนี้เมื่อตัดสินใจ stack แล้ว

```
Backend   : Node.js
Framework : Fastify
ORM       : Prisma
Frontend  : Next.js
Database  : MySQL 8.0
Cache     : Redis
Auth      : JWT (access token 1h + refresh token 30d)
```

---

## Database

- Engine: **MySQL 8.0** — InnoDB, utf8mb4_unicode_ci
- Schema file: `db/lms_schema_autoinc.sql`
- ID strategy: **BIGINT UNSIGNED AUTO_INCREMENT** ทุก table
- Soft delete: `deleted_at IS NULL` = active record — ห้าม hard DELETE ยกเว้น audit_logs
- Timestamps: `DATETIME(3)` timezone UTC ทุก table
- Multi-tenancy: **ทุก query ต้อง filter `tenant_id`** เสมอ — ห้ามลืม

### Tables ทั้งหมด (21 tables)

| กลุ่ม | Tables |
|---|---|
| Identity | `tenants`, `users`, `roles`, `user_roles` |
| Content | `courses`, `course_prerequisites`, `course_sections`, `lessons` |
| Learning | `enrollments`, `lesson_progress` |
| Assessment | `quizzes`, `questions`, `quiz_attempts`, `quiz_answers` |
| In-video | `video_questions`, `video_question_responses` |
| Reward | `certificates`, `badges`, `user_badges` |
| Platform | `notifications`, `audit_logs` |

### FK types

ทุก FK column เป็น `BIGINT UNSIGNED` ให้ตรง type กับ PK เสมอ

### Key relationships

```
tenants      1──N  users
tenants      1──N  courses
users        N──N  roles            (via user_roles)
courses      1──N  course_sections
course_sections 1──N lessons
users        N──N  courses          (via enrollments)
enrollments  1──N  lesson_progress  (per lesson per user)
quizzes      1──N  questions
quiz_attempts 1──N quiz_answers     (แยก table — ไม่ใช่ jsonb blob)
lessons      1──N  video_questions  (type = 'video' เท่านั้น)
video_questions 1──N video_question_responses  (ไม่ผูกกับ quiz_attempts)
```

### Soft delete pattern

```sql
-- ถูก
SELECT * FROM courses WHERE tenant_id = ? AND deleted_at IS NULL;

-- ผิด — ขาด deleted_at filter
SELECT * FROM courses WHERE tenant_id = ?;
```

### Certificate number

สร้างผ่าน TRIGGER อัตโนมัติหลัง insert รูปแบบ `CERT-{YEAR}-{LPAD(id,6,'0')}`
เช่น `CERT-2024-000042` — ห้ามสร้างเองในโค้ด

---

## API conventions

- Base path: `/api/v1/`
- Auth: `Authorization: Bearer <access_token>` header ทุก request ยกเว้น login, register, certificate verify
- Tenant: extract จาก JWT claims — **ห้ามรับ tenant_id จาก request body**
- Pagination: `?page=1&limit=20` (offset-based) ค่า default limit = 20, max = 100

### HTTP status codes

| Code | ใช้เมื่อ |
|---|---|
| 200 | GET, PATCH สำเร็จ |
| 201 | POST สร้าง resource ใหม่สำเร็จ |
| 204 | DELETE สำเร็จ (soft delete) |
| 400 | Validation error |
| 401 | Token หมดอายุ หรือไม่มี token |
| 403 | มี token แต่ไม่มี permission |
| 404 | ไม่พบ resource หรือ tenant ไม่ตรง |
| 409 | Duplicate เช่น enroll ซ้ำ, email ซ้ำ |
| 422 | Business logic error เช่น enroll course ที่ยัง draft |
| 429 | Rate limit exceeded |

### Error response format

```json
{
  "error": {
    "code": "ENROLLMENT_ALREADY_EXISTS",
    "message": "User is already enrolled in this course",
    "field": null,
    "request_id": "req_abc123"
  }
}
```

### Endpoints หลัก

```
POST   /api/v1/auth/login
POST   /api/v1/auth/refresh
DELETE /api/v1/auth/logout

GET    /api/v1/users
POST   /api/v1/users
GET    /api/v1/users/:id
PATCH  /api/v1/users/:id

GET    /api/v1/courses
POST   /api/v1/courses
GET    /api/v1/courses/:id
PATCH  /api/v1/courses/:id/publish

POST   /api/v1/enrollments
GET    /api/v1/users/:id/enrollments
PATCH  /api/v1/enrollments/:id/progress

GET    /api/v1/quizzes/:id
POST   /api/v1/quizzes/:id/attempts
POST   /api/v1/quiz-attempts/:id/submit

GET    /api/v1/users/:id/certificates
GET    /api/v1/certificates/verify/:number

GET    /api/v1/analytics/courses/:id
GET    /api/v1/analytics/users/:id/report
```

---

## Business rules — ห้ามลืม

1. **Enrollment check** — ก่อน serve lesson content ทุกครั้ง ต้องตรวจว่า user มี enrollment ที่ `status = 'active'` และ `expires_at IS NULL OR expires_at > NOW()`

2. **Quiz max_attempts** — ก่อน start attempt ใหม่ ต้อง count attempts ที่ submitted แล้ว เปรียบกับ `quizzes.max_attempts` (NULL = unlimited)

3. **Progress calculation** — `progress_percent` ใน enrollments คำนวณจาก `completed lessons / total lessons * 100` อัพเดตทุกครั้งที่ lesson_progress เปลี่ยนเป็น `completed`

4. **Auto-complete enrollment** — เมื่อ `progress_percent = 100` ให้ set `enrollments.status = 'completed'` และ `completed_at = NOW()` พร้อม trigger certificate generation

5. **Certificate** — ออกอัตโนมัติเมื่อ enrollment complete ห้ามออกซ้ำ (unique constraint บน user_id + course_id)

6. **Video questions** — `video_question_responses` ไม่มี max_attempts — user ดู video ซ้ำกี่ครั้งก็ตอบได้ทุกครั้ง

7. **Soft delete cascade** — เมื่อ soft delete user ให้ set `enrollments.deleted_at` ด้วย แต่ **ห้ามแตะ** `audit_logs`, `certificates`, `quiz_attempts` (ต้องเก็บ history)

8. **Tenant isolation** — ทุก query ที่ join หลาย table ต้อง filter `tenant_id` จาก table แรก อย่า trust `tenant_id` จาก nested record

---

## Naming conventions

```
Database  : snake_case  (user_id, created_at)
API JSON  : camelCase   (userId, createdAt)
Files     : kebab-case  (user-service.ts, course-controller.ts)
Classes   : PascalCase  (UserService, CourseController)
Functions : camelCase   (getUserById, createEnrollment)
Constants : UPPER_SNAKE (MAX_ATTEMPTS, JWT_SECRET)
```

---

## Indexes สำคัญ — อย่า query โดยไม่มี index

```sql
-- Hot paths ที่ใช้บ่อยที่สุด
users(tenant_id, is_active)
courses(tenant_id, status, deleted_at)
enrollments(user_id, status)
enrollments(user_id, course_id, deleted_at)   -- unique
lesson_progress(user_id, lesson_id)           -- unique
quiz_attempts(user_id, quiz_id, attempt_number)
video_questions(lesson_id, timestamp_seconds)
notifications(user_id, is_read, created_at)
audit_logs(tenant_id, created_at)
```

---

## Security rules

- ห้าม log `hashed_password`, `correct_answer`, JWT token
- `questions.correct_answer` ต้อง encrypt at rest — ส่งกลับ client ได้เฉพาะหลัง submit เท่านั้น
- `audit_logs` — INSERT only, ห้าม UPDATE และ DELETE ทุกกรณี
- Rate limit: auth endpoints 10 req/min, API ทั่วไป 100 req/min ต่อ user
- ทุก file upload ต้องผ่าน virus scan ก่อน store ใน S3

---

## Skills — auto-read rules

- เมื่อได้รับคำสั่งที่เกี่ยวกับ UI, component, CSS, layout, หน้าเว็บ
  → อ่าน `skills/frontend-design/SKILL.md` ก่อนเขียนโค้ดทุกครั้ง

---

## สิ่งที่ยังไม่ได้ implement (TODO)

- [ ] Payment / billing integration
- [ ] Discussion / forum per course
- [ ] Live session (Zoom/Teams integration)
- [ ] Push notification (FCM)
- [ ] Full-text search (Elasticsearch)
- [ ] SCORM / xAPI content player
- [ ] Bulk user import (CSV)