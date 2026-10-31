export const MAX_UPLOAD_BYTES = 250 * 1024 * 1024;

export type Video = {
  id: string;
  title: string;
  creator: string;
  category: string;
  duration: string;
  views: string;
  age: string;
  streamUrl: string;
  accent: string;
  label: string;
  progress?: number;
};

export type VideoRow = {
  id: string;
  title: string;
  creator: string;
  category: string;
  created_at: number;
  view_count?: number;
};

export type StoredVideo = {
  object_key: string;
  content_type: string;
};

export type PublishedVideoInput = {
  id: string;
  title: string;
  creator: string;
  category: string;
  objectKey: string;
  contentType: string;
  byteSize: number;
  ownerUserId: string;
  createdAt: number;
};

export function toPublicVideo(row: VideoRow): Video {
  const days = Math.max(0, Math.floor((Date.now() - row.created_at) / 86_400_000));
  return {
    id: row.id,
    title: row.title,
    creator: row.creator,
    category: row.category,
    duration: "New",
    views: formatViewCount(row.view_count ?? 0),
    age: days === 0 ? "just now" : `${days} day${days === 1 ? "" : "s"} ago`,
    streamUrl: `/api/videos/${row.id}/stream`,
    accent: "uploaded",
    label: row.category,
  };
}

export function sanitizeFilename(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]/g, "-").slice(-120) || "video";
}

export function formatViewCount(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1).replace(".0", "")}K`;
  return String(value);
}
