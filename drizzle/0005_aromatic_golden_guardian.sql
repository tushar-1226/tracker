CREATE TABLE `achievements_unlocked` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`key` text NOT NULL,
	`tier` integer NOT NULL,
	`unlocked_at` integer DEFAULT (unixepoch()) NOT NULL,
	`seen_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `achievements_user_key_tier_uq` ON `achievements_unlocked` (`user_id`,`key`,`tier`);--> statement-breakpoint
CREATE TABLE `goal_milestones` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`goal_id` text NOT NULL,
	`title` text NOT NULL,
	`position` integer DEFAULT 0 NOT NULL,
	`done_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`goal_id`) REFERENCES `goals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `goals` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`metric` text NOT NULL,
	`target` real NOT NULL,
	`baseline` real,
	`deadline` text,
	`completed_at` integer,
	`archived_at` integer,
	`created_at` integer DEFAULT (unixepoch()) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
