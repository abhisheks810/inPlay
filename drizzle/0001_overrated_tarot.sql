CREATE TABLE `video_engagement_events` (
	`id` text PRIMARY KEY NOT NULL,
	`video_id` text NOT NULL,
	`event_type` text NOT NULL,
	`session_id` text NOT NULL,
	`viewer_user_id` text,
	`watch_seconds` integer DEFAULT 0 NOT NULL,
	`occurred_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `engagement_video_time_idx` ON `video_engagement_events` (`video_id`,`occurred_at`);--> statement-breakpoint
CREATE INDEX `engagement_session_video_idx` ON `video_engagement_events` (`session_id`,`video_id`);