export const ENGAGEMENT_EVENT_TYPES = [
  "play",
  "progress",
  "complete",
  "like",
  "unlike",
  "save",
  "unsave",
  "upload_published",
] as const;

export type EngagementEventType = (typeof ENGAGEMENT_EVENT_TYPES)[number];

export type EngagementEventInput = {
  videoId: string;
  eventType: EngagementEventType;
  sessionId: string;
  watchSeconds: number;
};

export type EngagementMetrics = {
  videoId: string;
  plays: number;
  completions: number;
  likes: number;
  saves: number;
  watchSeconds: number;
};

export function parseEngagementEvent(value: unknown): EngagementEventInput | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  const videoId = typeof input.videoId === "string" ? input.videoId.trim() : "";
  const sessionId = typeof input.sessionId === "string" ? input.sessionId.trim() : "";
  const eventType = input.eventType;
  const watchSeconds = Math.max(
    0,
    Math.min(86_400, Math.floor(typeof input.watchSeconds === "number" ? input.watchSeconds : 0)),
  );

  if (!videoId || videoId.length > 120) return null;
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(sessionId)) return null;
  if (!ENGAGEMENT_EVENT_TYPES.includes(eventType as EngagementEventType)) return null;

  return { videoId, sessionId, eventType: eventType as EngagementEventType, watchSeconds };
}
