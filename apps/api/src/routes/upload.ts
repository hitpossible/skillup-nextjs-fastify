import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createWriteStream, mkdirSync } from "fs";
import { join, dirname, extname } from "path";
import { fileURLToPath } from "url";
import { pipeline } from "stream/promises";
import { randomBytes } from "crypto";

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const UPLOAD_DIR = join(dirname(fileURLToPath(import.meta.url)), "../../public/uploads");

mkdirSync(join(UPLOAD_DIR, "avatars"), { recursive: true });
mkdirSync(join(UPLOAD_DIR, "thumbnails"), { recursive: true });

export async function uploadRoutes(app: FastifyInstance) {
  app.post("/avatar", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: { message: "No file" } });
    if (!ALLOWED_TYPES.has(data.mimetype)) return reply.status(400).send({ error: { message: "Invalid type" } });

    const ext = extname(data.filename) || ".jpg";
    const filename = `${randomBytes(16).toString("hex")}${ext}`;
    const filepath = join(UPLOAD_DIR, "avatars", filename);

    await pipeline(data.file, createWriteStream(filepath));
    return reply.status(201).send({ url: `/public/uploads/avatars/${filename}` });
  });

  app.post("/course-thumbnails", async (request: FastifyRequest, reply: FastifyReply) => {
    const data = await request.file();
    if (!data) return reply.status(400).send({ error: { message: "No file" } });
    
    const ext = extname(data.filename) || ".jpg";
    const filename = `${randomBytes(16).toString("hex")}${ext}`;
    const filepath = join(UPLOAD_DIR, "thumbnails", filename);

    await pipeline(data.file, createWriteStream(filepath));
    return reply.status(201).send({ url: `/public/uploads/thumbnails/${filename}` });
  });
}
