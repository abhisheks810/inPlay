import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const videos = sqliteTable("videos", {
  id: text("id").primaryKey(), title: text("title").notNull(), creator: text("creator").notNull(), category: text("category").notNull(), objectKey: text("object_key").notNull().unique(), contentType: text("content_type").notNull(), byteSize: integer("byte_size").notNull(), ownerUserId: text("owner_user_id").notNull(), createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(), status: text("status").notNull().default("published"),
});
