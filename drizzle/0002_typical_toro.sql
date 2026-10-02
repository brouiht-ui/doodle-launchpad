ALTER TABLE `assets` ADD `source` text DEFAULT 'legacy' NOT NULL;--> statement-breakpoint
ALTER TABLE `assets` ADD `drawingHash` text;