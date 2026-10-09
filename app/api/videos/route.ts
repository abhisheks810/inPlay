import { env } from "cloudflare:workers";
import { getRawDb } from "@/db";
import { getChatGPTUser } from "@/app/chatgpt-auth";

export const dynamic = "force-dynamic";
type VideoRow = { id: string; title: string; creator: string; category: string; created_at: number };
function toVideo(row: VideoRow) { const days = Math.max(0, Math.floor((Date.now() - row.created_at) / 86_400_000)); return { id: row.id, title: row.title, creator: row.creator, category: row.category, duration: "New", views: "0", age: days === 0 ? "just now" : `${days} day${days === 1 ? "" : "s"} ago`, streamUrl: `/api/videos/${row.id}/stream`, accent: "uploaded", label: row.category }; }

export async function GET() {
  try { const result = await getRawDb().prepare("SELECT id, title, creator, category, created_at FROM videos WHERE status = ? ORDER BY created_at DESC LIMIT 60").bind("published").all<VideoRow>(); return Response.json({ videos: result.results.map(toVideo) }); }
  catch (error) { console.error("Unable to load videos", error); return Response.json({ videos: [], error: "The video library is temporarily unavailable." }, { status: 503 }); }
}

export async function POST(request: Request) {
  const user = await getChatGPTUser();
  if (!user) return Response.json({ error: "Sign in with ChatGPT to upload videos." }, { status: 401 });
  if (!env.BUCKET) return Response.json({ error: "Video storage is unavailable." }, { status: 503 });
  const url = new URL(request.url); const title = (url.searchParams.get("title") ?? "").trim().slice(0, 100); const category = (url.searchParams.get("category") ?? "Culture").trim().slice(0, 40); const filename = (url.searchParams.get("filename") ?? "video").replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120); const contentType = request.headers.get("content-type") ?? "application/octet-stream"; const byteSize = Number(request.headers.get("content-length") ?? "0");
  if (!title || !request.body) return Response.json({ error: "A title and video file are required." }, { status: 400 });
  if (!contentType.startsWith("video/")) return Response.json({ error: "Please upload an MP4, WebM, or MOV video." }, { status: 415 });
  if (byteSize > 250 * 1024 * 1024) return Response.json({ error: "Videos must be 250 MB or smaller." }, { status: 413 });
  const id = crypto.randomUUID(); const objectKey = `videos/${id}/${filename}`; const createdAt = Date.now();
  try { await env.BUCKET.put(objectKey, request.body, { httpMetadata: { contentType } }); await getRawDb().prepare("INSERT INTO videos (id, title, creator, category, object_key, content_type, byte_size, owner_user_id, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(id, title, user.displayName, category, objectKey, contentType, byteSize, user.userId, createdAt, "published").run(); return Response.json({ video: toVideo({ id, title, creator: user.displayName, category, created_at: createdAt }) }, { status: 201 }); }
  catch (error) { console.error("Unable to publish video", error); await env.BUCKET.delete(objectKey).catch(() => undefined); return Response.json({ error: "The upload could not be published. Your file was not saved." }, { status: 500 }); }
}
