import { FastifyInstance } from "fastify";

export async function adminRoutes(app: FastifyInstance) {
  // Returns all local /uploads/... URLs referenced in the DB.
  // Protected by X-Cron-Secret header — not JWT — so Next.js cron can call it.
  app.get("/api/v1/admin/referenced-files", async (req, reply) => {
    const secret = process.env["CRON_SECRET"];
    if (!secret || req.headers["x-cron-secret"] !== secret) {
      return reply.status(401).send({ error: "Unauthorized" });
    }

    const prisma = app.prisma;

    const lessons = await prisma.lesson.findMany({
      select: { content_url: true, attachments: true },
    });

    const urls = new Set<string>();

    for (const lesson of lessons) {
      if (lesson.content_url?.startsWith("/uploads/")) {
        urls.add(lesson.content_url);
      }
      if (Array.isArray(lesson.attachments)) {
        for (const att of lesson.attachments as { url?: string }[]) {
          if (att.url?.startsWith("/uploads/")) urls.add(att.url);
        }
      }
    }

    return reply.send({ urls: Array.from(urls) });
  });
}
