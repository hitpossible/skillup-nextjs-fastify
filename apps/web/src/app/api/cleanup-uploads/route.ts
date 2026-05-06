import { NextRequest, NextResponse } from "next/server";
import { readdir, stat, unlink } from "fs/promises";
import { join } from "path";

const ONE_HOUR_MS = 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  const secret = process.env["CRON_SECRET"];
  if (!secret || request.headers.get("x-cron-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const apiUrl = process.env["NEXT_PUBLIC_API_URL"] ?? "http://localhost:3001";
  const uploadsDir = join(process.cwd(), "public", "uploads");

  try {
    // 1. Get all file URLs still referenced in DB
    const refRes = await fetch(`${apiUrl}/api/v1/admin/referenced-files`, {
      headers: { "x-cron-secret": secret },
    });
    if (!refRes.ok) throw new Error("Failed to fetch referenced files from API");
    const { urls: referencedUrls }: { urls: string[] } = await refRes.json();
    const referencedSet = new Set(referencedUrls);

    // 2. List all files in uploads folder
    const files = await readdir(uploadsDir);
    const now = Date.now();
    const deleted: string[] = [];
    const kept: string[] = [];

    for (const filename of files) {
      const url = `/uploads/${filename}`;
      if (referencedSet.has(url)) {
        kept.push(filename);
        continue;
      }

      // Safety buffer: skip files younger than 1 hour (might be mid-upload or unsaved)
      const filePath = join(uploadsDir, filename);
      const { mtimeMs } = await stat(filePath);
      if (now - mtimeMs < ONE_HOUR_MS) {
        kept.push(filename);
        continue;
      }

      await unlink(filePath);
      deleted.push(filename);
    }

    return NextResponse.json({ deleted, kept: kept.length });
  } catch (error: any) {
    console.error("Cleanup error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
