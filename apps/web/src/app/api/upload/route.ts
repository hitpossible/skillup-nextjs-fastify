import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join, resolve, normalize } from "path";
import { existsSync } from "fs";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Create unique filename
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const filename = `${uniqueSuffix}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    
    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), "public", "uploads");
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    const filepath = join(uploadsDir, filename);
    await writeFile(filepath, buffer);

    const url = `/uploads/${filename}`;
    
    return NextResponse.json({ success: true, url, name: file.name, size: file.size, type: file.type });
  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "File upload failed" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { url } = await request.json() as { url?: string };

    if (!url || !url.startsWith("/uploads/")) {
      return NextResponse.json({ error: "Invalid file URL" }, { status: 400 });
    }

    const uploadsDir = resolve(join(process.cwd(), "public", "uploads"));
    const filename = url.replace("/uploads/", "");
    const filepath = resolve(join(uploadsDir, filename));

    // Prevent path traversal — resolved path must stay inside uploads dir
    if (!filepath.startsWith(uploadsDir + "/") && filepath !== uploadsDir) {
      return NextResponse.json({ error: "Invalid file path" }, { status: 400 });
    }

    if (existsSync(filepath)) {
      await unlink(filepath);
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete upload error:", error);
    return NextResponse.json({ error: "File delete failed" }, { status: 500 });
  }
}
