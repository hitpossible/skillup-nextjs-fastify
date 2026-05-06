import type { FastifyInstance } from "fastify";

// certificate_number สร้างผ่าน DB TRIGGER อัตโนมัติ — ห้ามสร้างเองในโค้ด (CLAUDE.md)
export async function issueCertificate(
  app: FastifyInstance,
  userId: bigint,
  courseId: bigint
): Promise<{ id: string; certificateNumber: string; issuedAt: string } | null> {
  // ตรวจว่าออกไปแล้วหรือยัง (unique constraint user_id + course_id)
  const existing = await app.prisma.certificate.findFirst({
    where: { userId, courseId },
    select: { id: true, certificateNumber: true, issuedAt: true },
  });
  if (existing) return null; // ออกแล้ว ไม่ต้องออกซ้ำ

  // BEFORE INSERT trigger เติม certificate_number อัตโนมัติ — ห้ามสร้างเองในโค้ด (CLAUDE.md)
  // ต้องส่ง placeholder เพราะ column NOT NULL แต่ trigger จะ override ก่อน INSERT จริง
  await app.prisma.$executeRaw`
    INSERT INTO certificates (user_id, course_id, certificate_number, issued_at)
    VALUES (${userId}, ${courseId}, 'PENDING', NOW(3))
  `;

  // ดึง record ที่เพิ่งสร้าง (TRIGGER เติม certificate_number แล้ว)
  const cert = await app.prisma.certificate.findFirst({
    where: { userId, courseId },
    select: { id: true, certificateNumber: true, issuedAt: true },
    orderBy: { issuedAt: "desc" },
  });

  if (!cert) return null;
  return {
    id: cert.id.toString(),
    certificateNumber: cert.certificateNumber,
    issuedAt: cert.issuedAt.toISOString(),
  };
}

export async function listCertificates(
  app: FastifyInstance,
  tenantId: bigint,
  userId: bigint
) {
  // tenant isolation — ตรวจว่า user อยู่ใน tenant เดียวกัน
  const user = await app.prisma.user.findFirst({
    where: { id: userId, tenantId, deletedAt: null },
    select: { id: true },
  });
  if (!user) return [];

  const certs = await app.prisma.certificate.findMany({
    where: { userId },
    select: {
      id: true,
      certificateNumber: true,
      pdfUrl: true,
      issuedAt: true,
      expires_at: true,
      course: { select: { id: true, title: true } },
    },
    orderBy: { issuedAt: "desc" },
  });

  return certs.map((c) => ({
    id: c.id.toString(),
    userId: userId.toString(),
    courseId: c.course.id.toString(),
    certificateNumber: c.certificateNumber,
    pdfUrl: c.pdfUrl,
    issuedAt: c.issuedAt.toISOString(),
    expiresAt: c.expires_at?.toISOString() ?? null,
    course: { id: c.course.id.toString(), title: c.course.title },
  }));
}

export async function verifyCertificate(
  app: FastifyInstance,
  certificateNumber: string
) {
  const cert = await app.prisma.certificate.findUnique({
    where: { certificateNumber },
    select: {
      id: true,
      certificateNumber: true,
      issuedAt: true,
      expires_at: true,
      user: { select: { id: true, full_name: true } },
      course: { select: { id: true, title: true } },
    },
  });
  if (!cert) return null;

  return {
    valid: cert.expires_at ? cert.expires_at > new Date() : true,
    certificateNumber: cert.certificateNumber,
    issuedAt: cert.issuedAt.toISOString(),
    expiresAt: cert.expires_at?.toISOString() ?? null,
    holder: cert.user.full_name,
    course: { id: cert.course.id.toString(), title: cert.course.title },
  };
}
