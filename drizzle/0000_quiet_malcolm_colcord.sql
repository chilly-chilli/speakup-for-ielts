CREATE TABLE `speaking_banks` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`version` text NOT NULL,
	`status` text NOT NULL,
	`questions` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `speaking_sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`request_key` text NOT NULL,
	`config` text NOT NULL,
	`plan` text NOT NULL,
	`bank` text NOT NULL,
	`status` text NOT NULL,
	`report` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `speaking_session_request` ON `speaking_sessions` (`owner`,`request_key`);--> statement-breakpoint
CREATE TABLE `speaking_turns` (
	`id` text PRIMARY KEY NOT NULL,
	`session_id` text NOT NULL,
	`event_key` text NOT NULL,
	`payload` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`session_id`) REFERENCES `speaking_sessions`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `speaking_turn_event` ON `speaking_turns` (`session_id`,`event_key`);