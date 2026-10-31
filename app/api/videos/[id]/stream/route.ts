import {
  getVideoObject,
  headVideoObject,
  VideoStorageUnavailableError,
} from "@/modules/storage/video-object-store";
import { findPublishedVideo } from "@/modules/videos/repository";
import { parseByteRange } from "@/modules/storage/byte-range";

export const dynamic = "force-dynamic";

async function streamVideo(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  try {
    const video = await findPublishedVideo(id);
    if (!video) return new Response("Video not found", { status: 404 });

    const metadata = await headVideoObject(video.object_key);
    if (!metadata) return new Response("Video not found", { status: 404 });
    const headers = new Headers({
      "content-type": video.content_type,
      "content-length": String(metadata.size),
      "cache-control": "private, no-store",
      "accept-ranges": "bytes",
      etag: metadata.httpEtag,
      "last-modified": metadata.uploaded.toUTCString(),
    });
    if (request.method === "HEAD") return new Response(null, { headers });

    const requestedRange = request.headers.get("range");
    const ifRange = request.headers.get("if-range");
    const canUseRange = !ifRange || ifRange === metadata.httpEtag || ifRange === metadata.uploaded.toUTCString();
    const range = requestedRange && canUseRange ? parseByteRange(requestedRange, metadata.size) : undefined;
    if (range === null) {
      headers.set("content-range", `bytes */${metadata.size}`);
      headers.set("content-length", "0");
      return new Response(null, { status: 416, headers });
    }
    const object = await getVideoObject(video.object_key, range);
    if (!object) return new Response("Video not found", { status: 404 });
    if (range) {
      headers.set("content-range", `bytes ${range.offset}-${range.offset + range.length - 1}/${metadata.size}`);
      headers.set("content-length", String(range.length));
    }
    return new Response(object.body, { status: range ? 206 : 200, headers });
  } catch (error) {
    console.error("Unable to stream video", error);
    const message =
      error instanceof VideoStorageUnavailableError
        ? "Video storage unavailable"
        : "Video temporarily unavailable";
    return new Response(message, { status: 503 });
  }
}

export const GET = streamVideo;
export const HEAD = streamVideo;
