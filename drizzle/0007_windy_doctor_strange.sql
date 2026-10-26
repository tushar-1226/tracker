ALTER TABLE `transactions` ADD `client_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `transactions_client_uq` ON `transactions` (`user_id`,`client_id`);