import { getRawDb } from "@/db";
import type { PublishedVideoInput, StoredVideo, VideoRow } from "./types";

export async function listPublishedVideos(limit = 60): Promise<VideoRow[]> {
  const result = await getRawDb()
    .prepare(
      `SELECT v.id, v.title, v.creator, v.category, v.created_at,
        COUNT(DISTINCT CASE WHEN e.event_type = 'play' THEN e.session_id END) AS view_count
       FROM videos v
       LEFT JOIN video_engagement_events e ON e.video_id = v.id
       WHERE v.status = ?
       GROUP BY v.id
       ORDER BY v.created_at DESC
       LIMIT ?`,
    )
    .bind("published", limit)
    .all<VideoRow>();

  return result.results;
}

export async function findPublishedVideo(id: string): Promise<StoredVideo | null> {
  return getRawDb()
    .prepare(
      "SELECT object_key, content_type FROM videos WHERE id = ? AND status = ? LIMIT 1",
    )
    .bind(id, "published")
    .first<StoredVideo>();
}

export async function insertPublishedVideo(video: PublishedVideoInput): Promise<void> {
  await getRawDb()
    .prepare(
      `INSERT INTO videos
       (id, title, creator, category, object_key, content_type, byte_size, owner_user_id, created_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      video.id,
      video.title,
      video.creator,
      video.category,
      video.objectKey,
      video.contentType,
      video.byteSize,
      video.ownerUserId,
      video.createdAt,
      "published",
    )
    .run();
}
