CREATE TABLE `coin_pages` (
	`coinId` text PRIMARY KEY NOT NULL,
	`content` text NOT NULL,
	`revision` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	FOREIGN KEY (`coinId`) REFERENCES `coins`(`id`) ON UPDATE no action ON DELETE no action
);
