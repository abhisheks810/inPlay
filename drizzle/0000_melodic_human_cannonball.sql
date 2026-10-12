CREATE TABLE `videos` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`creator` text NOT NULL,
	`category` text NOT NULL,
	`object_key` text NOT NULL,
	`content_type` text NOT NULL,
	`byte_size` integer NOT NULL,
	`owner_user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`status` text DEFAULT 'published' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `videos_object_key_unique` ON `videos` (`object_key`);