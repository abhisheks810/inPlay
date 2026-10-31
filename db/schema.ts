import { index, integer, primaryKey, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

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

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  displayName: text("display_name").notNull(),
  email: text("email"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const externalIdentities = sqliteTable(
  "external_identities",
  {
    provider: text("provider").notNull(),
    subject: text("subject").notNull(),
    userId: text("user_id").notNull(),
    email: text("email"),
    emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
    displayName: text("display_name"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    lastSignedInAt: integer("last_signed_in_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.provider, table.subject] }),
    index("external_identity_user_idx").on(table.userId),
  ],
);

export const authSessions = sqliteTable(
  "auth_sessions",
  {
    tokenHash: text("token_hash").primaryKey(),
    userId: text("user_id").notNull(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [index("auth_session_user_idx").on(table.userId), index("auth_session_expiry_idx").on(table.expiresAt)],
);

export const oauthTransactions = sqliteTable(
  "oauth_transactions",
  {
    stateHash: text("state_hash").primaryKey(),
    provider: text("provider").notNull(),
    codeVerifier: text("code_verifier"),
    nonce: text("nonce").notNull(),
    returnTo: text("return_to").notNull().default("/"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  },
  (table) => [
    uniqueIndex("oauth_transaction_state_idx").on(table.stateHash),
    index("oauth_transaction_expiry_idx").on(table.expiresAt),
  ],
);
