import { env } from "cloudflare:workers";
import { getRawDb } from "@/db";

export const dynamic = "force-dynamic";
type StoredVideo = { object_key: string; content_type: string };

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  if (!env.BUCKET) return new Response("Video storage unavailable", { status: 503 });
  const { id } = await params;
  try { const row = await getRawDb().prepare("SELECT object_key, content_type FROM videos WHERE id = ? AND status = ? LIMIT 1").bind(id, "published").first<StoredVideo>(); if (!row) return new Response("Video not found", { status: 404 }); const object = await env.BUCKET.get(row.object_key); if (!object) return new Response("Video not found", { status: 404 }); return new Response(object.body, { headers: { "content-type": row.content_type, "content-length": String(object.size), "cache-control": "public, max-age=3600", "accept-ranges": "bytes" } }); }
  catch (error) { console.error("Unable to stream video", error); return new Response("Video temporarily unavailable", { status: 503 }); }
}
