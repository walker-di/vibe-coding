CREATE TABLE `products` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`image_url` text,
	`industry` text,
	`overview` text,
	`details` text,
	`features_strengths` text,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `strategies` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` integer NOT NULL,
	`positioning_3c` text,
	`positioning_pod_pop` text,
	`who_insights` text,
	`what_benefits` text,
	`how_appeal_axis` text,
	`how_expression_axis` text,
	`how_media_plan` text,
	`how_objectives` text,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_creatives` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`persona_id` integer NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`campaign_id` integer,
	`theme_id` integer,
	`strategy_id` integer,
	`design_notes` text,
	`expression_notes` text,
	`audio_notes` text,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`theme_id`) REFERENCES `themes`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`strategy_id`) REFERENCES `strategies`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
INSERT INTO `__new_creatives`("id", "persona_id", "name", "type", "description", "campaign_id", "theme_id", "strategy_id", "design_notes", "expression_notes", "audio_notes", "created_at", "updated_at") SELECT "id", "persona_id", "name", "type", "description", "campaign_id", "theme_id", "strategy_id", "design_notes", "expression_notes", "audio_notes", "created_at", "updated_at" FROM `creatives`;--> statement-breakpoint
DROP TABLE `creatives`;--> statement-breakpoint
ALTER TABLE `__new_creatives` RENAME TO `creatives`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
ALTER TABLE `creative_image` ADD `imageUrl` text NOT NULL;--> statement-breakpoint
ALTER TABLE `creative_image` DROP COLUMN `url`;--> statement-breakpoint
ALTER TABLE `creative_lp` ADD `pageUrl` text NOT NULL;--> statement-breakpoint
ALTER TABLE `creative_lp` DROP COLUMN `url`;--> statement-breakpoint
ALTER TABLE `creative_video` ADD `videoUrl` text;--> statement-breakpoint
ALTER TABLE `creative_video` DROP COLUMN `url`;--> statement-breakpoint
ALTER TABLE `personas` ADD `product_id` integer NOT NULL REFERENCES products(id);--> statement-breakpoint
ALTER TABLE `personas` ADD `insights` text;--> statement-breakpoint
ALTER TABLE `themes` ADD `updated_at` integer;--> statement-breakpoint
ALTER TABLE `video_templates` ADD `updated_at` integer;