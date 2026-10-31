import { getRawDb } from "@/db";
import type { EngagementEventInput, EngagementMetrics } from "./types";

export async function recordEngagementEvent(
  event: EngagementEventInput,
  viewerUserId: string | null,
): Promise<void> {
  await getRawDb()
    .prepare(
      `INSERT INTO video_engagement_events
       (id, video_id, event_type, session_id, viewer_user_id, watch_seconds, occurred_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      crypto.randomUUID(),
      event.videoId,
      event.eventType,
      event.sessionId,
      viewerUserId,
      event.watchSeconds,
      Date.now(),
    )
    .run();
}

type MetricsRow = {
  video_id: string;
  plays: number;
  completions: number;
  likes: number;
  saves: number;
  watch_seconds: number;
};

export async function getEngagementMetrics(videoId: string): Promise<EngagementMetrics> {
  const row = await getRawDb()
    .prepare(
      `WITH session_watch AS (
         SELECT session_id, MAX(watch_seconds) AS watch_seconds
         FROM video_engagement_events
         WHERE video_id = ? AND event_type IN ('progress', 'complete')
         GROUP BY session_id
       )
       SELECT
         ? AS video_id,
         COUNT(DISTINCT CASE WHEN event_type = 'play' THEN session_id END) AS plays,
         COUNT(CASE WHEN event_type = 'complete' THEN 1 END) AS completions,
         COUNT(CASE WHEN event_type = 'like' THEN 1 END) - COUNT(CASE WHEN event_type = 'unlike' THEN 1 END) AS likes,
         COUNT(CASE WHEN event_type = 'save' THEN 1 END) - COUNT(CASE WHEN event_type = 'unsave' THEN 1 END) AS saves,
         COALESCE((SELECT SUM(watch_seconds) FROM session_watch), 0) AS watch_seconds
       FROM video_engagement_events
       WHERE video_id = ?`,
    )
    .bind(videoId, videoId, videoId)
    .first<MetricsRow>();

  return {
    videoId,
    plays: Number(row?.plays ?? 0),
    completions: Number(row?.completions ?? 0),
    likes: Math.max(0, Number(row?.likes ?? 0)),
    saves: Math.max(0, Number(row?.saves ?? 0)),
    watchSeconds: Number(row?.watch_seconds ?? 0),
  };
}
