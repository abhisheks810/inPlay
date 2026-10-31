import {
  getVideoObject,
  VideoStorageUnavailableError,
} from "@/modules/storage/video-object-store";
import { findPublishedVideo } from "@/modules/videos/repository";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const video = await findPublishedVideo(id);
    if (!video) return new Response("Video not found", { status: 404 });

    const object = await getVideoObject(video.object_key);
    if (!object) return new Response("Video not found", { status: 404 });

    return new Response(object.body, {
      headers: {
        "content-type": video.content_type,
        "content-length": String(object.size),
        "cache-control": "public, max-age=3600",
        "accept-ranges": "bytes",
      },
    });
  } catch (error) {
    console.error("Unable to stream video", error);
    const message =
      error instanceof VideoStorageUnavailableError
        ? "Video storage unavailable"
        : "Video temporarily unavailable";
    return new Response(message, { status: 503 });
  }
}
