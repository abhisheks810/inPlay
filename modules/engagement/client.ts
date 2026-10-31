import type { EngagementEventType } from "./types";

const SESSION_KEY = "streamline.engagement.session";

function getSessionId(): string {
  const existing = window.localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const created = crypto.randomUUID();
  window.localStorage.setItem(SESSION_KEY, created);
  return created;
}

export function trackEngagement(
  videoId: string,
  eventType: EngagementEventType,
  watchSeconds = 0,
): void {
  const body = JSON.stringify({ videoId, eventType, watchSeconds, sessionId: getSessionId() });
  void fetch("/api/engagement", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => undefined);
}
