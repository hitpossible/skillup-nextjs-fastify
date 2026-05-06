import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

async function main() {
  // ── Tenant ──────────────────────────────────────────────────────────────
  const tenant = await prisma.tenant.upsert({
    where: { slug: "demo" },
    update: {},
    create: { name: "Demo Company", slug: "demo", plan: "pro", isActive: true },
  });
  console.log(`✓ Tenant: ${tenant.name} (id=${tenant.id})`);

  // ── Roles (scoped to tenant) ─────────────────────────────────────────────
  const adminRole = await prisma.role.upsert({
    where: { tenant_id_name: { tenant_id: tenant.id, name: "admin" } },
    update: {},
    create: {
      tenant_id: tenant.id,
      name: "admin",
      permissions: ["*"],
      is_system: true,
    },
  });

  const instructorRole = await prisma.role.upsert({
    where: { tenant_id_name: { tenant_id: tenant.id, name: "instructor" } },
    update: {},
    create: {
      tenant_id: tenant.id,
      name: "instructor",
      permissions: ["courses:write", "courses:read", "analytics:read"],
      is_system: true,
    },
  });

  const learnerRole = await prisma.role.upsert({
    where: { tenant_id_name: { tenant_id: tenant.id, name: "learner" } },
    update: {},
    create: {
      tenant_id: tenant.id,
      name: "learner",
      permissions: ["courses:read", "enrollments:write", "quiz:write"],
      is_system: true,
    },
  });
  console.log(`✓ Roles: ${adminRole.name}, ${instructorRole.name}, ${learnerRole.name}`);

  // ── Users ────────────────────────────────────────────────────────────────
  const adminPw = await hashPassword("Admin1234!");
  const instructorPw = await hashPassword("Instructor1234!");
  const learnerPw = await hashPassword("Learner1234!");

  const adminUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "admin@demo.com" } },
    update: { hashedPassword: adminPw },
    create: {
      tenantId: tenant.id,
      email: "admin@demo.com",
      hashedPassword: adminPw,
      full_name: "Admin Demo",
      locale: "th",
      isActive: true,
    },
  });

  const instructorUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "instructor@demo.com" } },
    update: { hashedPassword: instructorPw },
    create: {
      tenantId: tenant.id,
      email: "instructor@demo.com",
      hashedPassword: instructorPw,
      full_name: "สมชาย ใจดี",
      locale: "th",
      isActive: true,
    },
  });

  const learnerUser = await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: "learner@demo.com" } },
    update: { hashedPassword: learnerPw },
    create: {
      tenantId: tenant.id,
      email: "learner@demo.com",
      hashedPassword: learnerPw,
      full_name: "สมหญิง รักเรียน",
      locale: "th",
      isActive: true,
    },
  });
  console.log(`✓ Users: ${adminUser.email}, ${instructorUser.email}, ${learnerUser.email}`);

  // ── User Roles ───────────────────────────────────────────────────────────
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: adminUser.id, roleId: adminRole.id } },
    update: {},
    create: { userId: adminUser.id, roleId: adminRole.id },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: instructorUser.id, roleId: instructorRole.id } },
    update: {},
    create: { userId: instructorUser.id, roleId: instructorRole.id },
  });
  await prisma.userRole.upsert({
    where: { userId_roleId: { userId: learnerUser.id, roleId: learnerRole.id } },
    update: {},
    create: { userId: learnerUser.id, roleId: learnerRole.id },
  });
  console.log(`✓ User roles assigned`);
  
  // ── Categories ───────────────────────────────────────────────────────────
  const catSoftware = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "software-development" } },
    update: {},
    create: { tenantId: tenant.id, name: "การพัฒนาซอฟต์แวร์", slug: "software-development" },
  });
  const catBusiness = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "business" } },
    update: {},
    create: { tenantId: tenant.id, name: "ธุรกิจและการจัดการ", slug: "business" },
  });
  const catMarketing = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "marketing" } },
    update: {},
    create: { tenantId: tenant.id, name: "การตลาด", slug: "marketing" },
  });
  const catDesign = await prisma.category.upsert({
    where: { tenantId_slug: { tenantId: tenant.id, slug: "design" } },
    update: {},
    create: { tenantId: tenant.id, name: "การออกแบบ", slug: "design" },
  });
  console.log(`✓ Categories: ${catSoftware.name}, ${catBusiness.name}, ${catMarketing.name}, ${catDesign.name}`);

  // ── Course ───────────────────────────────────────────────────────────────
  const course = await prisma.course.upsert({
    where: { id: 1n },
    update: {},
    create: {
      tenantId: tenant.id,
      created_by: instructorUser.id,
      title: "TypeScript สำหรับ Backend Developer",
      description: "เรียนรู้ TypeScript ตั้งแต่พื้นฐานจนถึง Advanced พร้อม pattern ที่ใช้จริงใน production",
      status: "published",
      language: "th",
      duration_minutes: 180,
      published_at: new Date(),
    },
  });
  console.log(`✓ Course: ${course.title}`);

  // ── Sections ─────────────────────────────────────────────────────────────
  const section1 = await prisma.courseSection.upsert({
    where: { id: 1n },
    update: {},
    create: { courseId: course.id, title: "พื้นฐาน TypeScript", sort_order: 1 },
  });

  const section2 = await prisma.courseSection.upsert({
    where: { id: 2n },
    update: {},
    create: { courseId: course.id, title: "Advanced Types", sort_order: 2 },
  });

  // ── Lessons ──────────────────────────────────────────────────────────────
  const lesson1 = await prisma.lesson.upsert({
    where: { id: 1n },
    update: {},
    create: {
      sectionId: section1.id,
      title: "Introduction to TypeScript",
      type: "video",
      content_url: "https://example.com/videos/ts-intro.mp4",
      duration_seconds: 600,
      sort_order: 1,
      has_iv_questions: true,
    },
  });

  const lesson2 = await prisma.lesson.upsert({
    where: { id: 2n },
    update: {},
    create: {
      sectionId: section1.id,
      title: "Types และ Interfaces",
      type: "video",
      content_url: "https://example.com/videos/ts-types.mp4",
      duration_seconds: 900,
      sort_order: 2,
    },
  });

  const quizLesson = await prisma.lesson.upsert({
    where: { id: 3n },
    update: {},
    create: {
      sectionId: section1.id,
      title: "แบบทดสอบท้ายบท 1",
      type: "quiz",
      sort_order: 3,
    },
  });

  const lesson3 = await prisma.lesson.upsert({
    where: { id: 4n },
    update: {},
    create: {
      sectionId: section2.id,
      title: "Generics",
      type: "video",
      content_url: "https://example.com/videos/ts-generics.mp4",
      duration_seconds: 1200,
      sort_order: 1,
    },
  });
  console.log(`✓ Lessons: ${lesson1.title}, ${lesson2.title}, ${quizLesson.title}, ${lesson3.title}`);

  // ── Video Question (in-video ที่ 2:00) ───────────────────────────────────
  await prisma.videoQuestion.upsert({
    where: { id: 1n },
    update: {},
    create: {
      lessonId: lesson1.id,
      timestampSeconds: 120,
      type: "single_choice",
      body: "TypeScript คืออะไร?",
      options: [
        "Superset of JavaScript",
        "Subset of JavaScript",
        "ภาษาใหม่ที่ไม่เกี่ยวกับ JavaScript",
        "Framework ของ JavaScript",
      ],
      correctAnswer: "Superset of JavaScript",
      is_blocking: true,
      sort_order: 1,
    },
  });
  console.log(`✓ Video question added`);

  // ── Quiz ─────────────────────────────────────────────────────────────────
  const quiz = await prisma.quiz.upsert({
    where: { id: 1n },
    update: {},
    create: {
      course_id: course.id,
      lessonId: quizLesson.id,
      title: "แบบทดสอบ TypeScript พื้นฐาน",
      type: "graded",
      passingScore: 70,
      maxAttempts: 3,
      time_limit_seconds: 600,
      shuffle_questions: false,
    },
  });

  await prisma.question.upsert({
    where: { id: 1n },
    update: {},
    create: {
      quizId: quiz.id,
      type: "single_choice",
      body: "ข้อใดคือ primitive type ใน TypeScript?",
      options: ["string", "Array", "object", "Promise"],
      correctAnswer: "string",
      points: 1,
      sort_order: 1,
    },
  });

  await prisma.question.upsert({
    where: { id: 2n },
    update: {},
    create: {
      quizId: quiz.id,
      type: "true_false",
      body: "TypeScript เป็น statically typed language",
      options: ["true", "false"],
      correctAnswer: "true",
      points: 1,
      sort_order: 2,
      explanation: "TypeScript เพิ่ม static type system ให้กับ JavaScript",
    },
  });
  console.log(`✓ Quiz: ${quiz.title} (${quiz.maxAttempts} attempts, ${quiz.passingScore}% passing)`);

  // ── Badge ─────────────────────────────────────────────────────────────────
  await prisma.badge.upsert({
    where: { id: 1n },
    update: {},
    create: {
      tenant_id: tenant.id,
      name: "First Course Complete",
      criteria_type: "course_complete",
      criteria_value: { count: 1 },
    },
  });
  console.log(`✓ Badge added`);

  console.log("\n🎉 Seed completed successfully");
  console.log("\nTest accounts:");
  console.log("  admin@demo.com      / Admin1234!");
  console.log("  instructor@demo.com / Instructor1234!");
  console.log("  learner@demo.com    / Learner1234!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
