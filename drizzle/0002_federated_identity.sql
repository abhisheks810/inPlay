CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`email` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `external_identities` (
	`provider` text NOT NULL,
	`subject` text NOT NULL,
	`user_id` text NOT NULL,
	`email` text,
	`email_verified` integer DEFAULT false NOT NULL,
	`display_name` text,
	`created_at` integer NOT NULL,
	`last_signed_in_at` integer NOT NULL,
	PRIMARY KEY(`provider`, `subject`)
);
--> statement-breakpoint
CREATE INDEX `external_identity_user_idx` ON `external_identities` (`user_id`);
--> statement-breakpoint
CREATE TABLE `auth_sessions` (
	`token_hash` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `auth_session_user_idx` ON `auth_sessions` (`user_id`);
--> statement-breakpoint
CREATE INDEX `auth_session_expiry_idx` ON `auth_sessions` (`expires_at`);
--> statement-breakpoint
CREATE TABLE `oauth_transactions` (
	`state_hash` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`code_verifier` text,
	`nonce` text NOT NULL,
	`return_to` text DEFAULT '/' NOT NULL,
	`created_at` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `oauth_transaction_state_idx` ON `oauth_transactions` (`state_hash`);
--> statement-breakpoint
CREATE INDEX `oauth_transaction_expiry_idx` ON `oauth_transactions` (`expires_at`);
