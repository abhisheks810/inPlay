import { getCurrentUser } from "@/app/auth";
import {
  buildVideoObjectKey,
  deleteVideoObject,
  putVideoObject,
  VideoStorageUnavailableError,
} from "@/modules/storage/video-object-store";
import { insertPublishedVideo, listPublishedVideos } from "@/modules/videos/repository";
import { MAX_UPLOAD_BYTES, sanitizeFilename, toPublicVideo } from "@/modules/videos/types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const videos = await listPublishedVideos();
    return Response.json({ videos: videos.map(toPublicVideo) });
  } catch (error) {
    console.error("Unable to load videos", error);
    return Response.json(
      { videos: [], error: "The video library is temporarily unavailable." },
      { status: 503 },
    );
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "Sign in with a verified account to upload videos." }, { status: 401 });
  }

  const url = new URL(request.url);
  const title = (url.searchParams.get("title") ?? "").trim().slice(0, 100);
  const category = (url.searchParams.get("category") ?? "Culture").trim().slice(0, 40);
  const filename = sanitizeFilename(url.searchParams.get("filename") ?? "video");
  const contentType = request.headers.get("content-type") ?? "application/octet-stream";
  const byteSize = Number(request.headers.get("content-length") ?? "0");

  if (!title || !request.body) {
    return Response.json({ error: "A title and video file are required." }, { status: 400 });
  }
  if (!contentType.startsWith("video/")) {
    return Response.json({ error: "Please upload an MP4, WebM, or MOV video." }, { status: 415 });
  }
  if (!Number.isFinite(byteSize) || byteSize < 0 || byteSize > MAX_UPLOAD_BYTES) {
    return Response.json({ error: "Videos must be 250 MB or smaller." }, { status: 413 });
  }

  const id = crypto.randomUUID();
  const objectKey = buildVideoObjectKey(id, filename);
  const createdAt = Date.now();

  try {
    await putVideoObject(objectKey, request.body, contentType);
    await insertPublishedVideo({
      id,
      title,
      creator: user.displayName,
      category,
      objectKey,
      contentType,
      byteSize,
      ownerUserId: user.userId,
      createdAt,
    });
    return Response.json(
      { video: toPublicVideo({ id, title, creator: user.displayName, category, created_at: createdAt }) },
      { status: 201 },
    );
  } catch (error) {
    console.error("Unable to publish video", error);
    await deleteVideoObject(objectKey).catch(() => undefined);
    const status = error instanceof VideoStorageUnavailableError ? 503 : 500;
    return Response.json(
      { error: "The upload could not be published. Your file was not saved." },
      { status },
    );
  }
}
