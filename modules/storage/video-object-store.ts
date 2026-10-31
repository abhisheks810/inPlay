import { env } from "cloudflare:workers";

export class VideoStorageUnavailableError extends Error {
  constructor() {
    super("Video storage is unavailable.");
    this.name = "VideoStorageUnavailableError";
  }
}

function getBucket(): R2Bucket {
  if (!env.BUCKET) throw new VideoStorageUnavailableError();
  return env.BUCKET;
}

export function buildVideoObjectKey(videoId: string, filename: string): string {
  return `videos/${videoId}/${filename}`;
}

export async function putVideoObject(
  objectKey: string,
  body: ReadableStream,
  contentType: string,
): Promise<void> {
  await getBucket().put(objectKey, body, { httpMetadata: { contentType } });
}

export async function getVideoObject(objectKey: string): Promise<R2ObjectBody | null> {
  return getBucket().get(objectKey);
}

export async function deleteVideoObject(objectKey: string): Promise<void> {
  await getBucket().delete(objectKey);
}
