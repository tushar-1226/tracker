CREATE TABLE `push_subscriptions` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`endpoint` text NOT NULL,
	`p256dh` text NOT NULL,
	`auth` text NOT NULL,
	`device` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_endpoint_uq` ON `push_subscriptions` (`endpoint`);--> statement-breakpoint
CREATE TABLE `reminders` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`kind` text NOT NULL,
	`ref_id` text,
	`title` text NOT NULL,
	`body` text,
	`url` text DEFAULT '/' NOT NULL,
	`time` text NOT NULL,
	`days` text DEFAULT '[]' NOT NULL,
	`enabled` integer DEFAULT true NOT NULL,
	`last_sent_date` text,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
