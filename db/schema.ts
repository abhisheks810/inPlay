import { index, integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const videos = sqliteTable("videos", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  creator: text("creator").notNull(),
  category: text("category").notNull(),
  objectKey: text("object_key").notNull().unique(),
  contentType: text("content_type").notNull(),
  byteSize: integer("byte_size").notNull(),
  ownerUserId: text("owner_user_id").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  status: text("status").notNull().default("published"),
});

export const videoEngagementEvents = sqliteTable(
  "video_engagement_events",
  {
    id: text("id").primaryKey(),
    videoId: text("video_id").notNull(),
    eventType: text("event_type").notNull(),
    sessionId: text("session_id").notNull(),
    viewerUserId: text("viewer_user_id"),
    watchSeconds: integer("watch_seconds").notNull().default(0),
    occurredAt: integer("occurred_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    index("engagement_video_time_idx").on(table.videoId, table.occurredAt),
    index("engagement_session_video_idx").on(table.sessionId, table.videoId),
  ],
);
