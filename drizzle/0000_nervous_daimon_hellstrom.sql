CREATE TABLE `assets` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`createdAt` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `challenges` (
	`nonce` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`message` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_challenges_address` ON `challenges` (`address`,`expires`);--> statement-breakpoint
CREATE TABLE `coins` (
	`id` text PRIMARY KEY NOT NULL,
	`owner` text NOT NULL,
	`name` text NOT NULL,
	`symbol` text NOT NULL,
	`description` text NOT NULL,
	`pair` text NOT NULL,
	`image` text NOT NULL,
	`communityBps` integer NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`createdAt` integer NOT NULL,
	`mint` text,
	`signature` text
);
--> statement-breakpoint
CREATE INDEX `idx_coins_created` ON `coins` (`createdAt`);--> statement-breakpoint
CREATE TABLE `intents` (
	`id` text PRIMARY KEY NOT NULL,
	`kind` text NOT NULL,
	`owner` text NOT NULL,
	`entityId` text NOT NULL,
	`target` text NOT NULL,
	`message` text NOT NULL,
	`transaction` text NOT NULL,
	`expires` integer NOT NULL,
	`signature` text,
	`state` text DEFAULT 'prepared' NOT NULL,
	`meta` text NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_intents_entity` ON `intents` (`entityId`,`state`);--> statement-breakpoint
CREATE TABLE `jobs` (
	`id` text PRIMARY KEY NOT NULL,
	`coinId` text NOT NULL,
	`owner` text NOT NULL,
	`title` text NOT NULL,
	`description` text NOT NULL,
	`reward` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`coinId`) REFERENCES `coins`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_jobs_coin` ON `jobs` (`coinId`);--> statement-breakpoint
CREATE INDEX `idx_jobs_created` ON `jobs` (`createdAt`);--> statement-breakpoint
CREATE TABLE `rates` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`hash` text PRIMARY KEY NOT NULL,
	`address` text NOT NULL,
	`expires` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `submissions` (
	`id` text PRIMARY KEY NOT NULL,
	`jobId` text NOT NULL,
	`wallet` text NOT NULL,
	`url` text NOT NULL,
	`note` text NOT NULL,
	`status` text DEFAULT 'submitted' NOT NULL,
	`signature` text,
	`createdAt` integer NOT NULL,
	FOREIGN KEY (`jobId`) REFERENCES `jobs`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_submissions_job_wallet` ON `submissions` (`jobId`,`wallet`);--> statement-breakpoint
CREATE UNIQUE INDEX `idx_submissions_signature` ON `submissions` (`signature`);