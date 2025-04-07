ALTER TABLE `user` RENAME TO `creative_image`;--> statement-breakpoint
CREATE TABLE `campaigns` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`goal` text,
	`start_date` integer,
	`end_date` integer,
	`target_platforms` text,
	`status` text DEFAULT 'Draft',
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `creative_lp` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creative_id` integer NOT NULL,
	`url` text NOT NULL,
	`headline` text,
	`key_sections` text,
	FOREIGN KEY (`creative_id`) REFERENCES `creatives`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `creative_lp_creative_id_unique` ON `creative_lp` (`creative_id`);--> statement-breakpoint
CREATE TABLE `creative_text` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creative_id` integer NOT NULL,
	`headline` text,
	`body` text NOT NULL,
	`call_to_action` text,
	FOREIGN KEY (`creative_id`) REFERENCES `creatives`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `creative_text_creative_id_unique` ON `creative_text` (`creative_id`);--> statement-breakpoint
CREATE TABLE `creative_video` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creative_id` integer NOT NULL,
	`url` text,
	`platform` text,
	`format` text,
	`duration` integer,
	`appeal_feature` text,
	`emotion` text,
	`template_id` integer,
	FOREIGN KEY (`creative_id`) REFERENCES `creatives`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`template_id`) REFERENCES `video_templates`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `creative_video_creative_id_unique` ON `creative_video` (`creative_id`);--> statement-breakpoint
CREATE TABLE `creatives` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`type` text NOT NULL,
	`description` text,
	`campaign_id` integer,
	`persona_id` integer,
	`theme_id` integer,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer,
	FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`theme_id`) REFERENCES `themes`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE TABLE `personas` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`persona_title` text,
	`image_url` text,
	`age_range_selection` text DEFAULT 'Unspecified',
	`age_range_custom` text,
	`gender` text DEFAULT 'Unspecified',
	`location` text,
	`job_title` text,
	`income_level` text,
	`personality_traits` text,
	`values_text` text,
	`spending_habits` text,
	`interests_hobbies` text,
	`lifestyle` text,
	`needs_pain_points` text,
	`goals_expectations` text,
	`backstory` text,
	`purchase_process` text,
	`is_generated` integer DEFAULT false,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
	`updated_at` integer
);
--> statement-breakpoint
CREATE TABLE `themes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`title` text NOT NULL,
	`description` text,
	`associated_pain_point` text,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `video_templates` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`template_code` text,
	`name` text,
	`duration_seconds` integer,
	`material_count` integer,
	`aspect_ratio` text,
	`scene_count` integer,
	`recommended_platforms` text,
	`resolution` text,
	`preview_url` text,
	`created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `video_templates_template_code_unique` ON `video_templates` (`template_code`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_creative_image` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creative_id` integer NOT NULL,
	`url` text NOT NULL,
	`alt_text` text,
	`width` integer,
	`height` integer,
	FOREIGN KEY (`creative_id`) REFERENCES `creatives`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_creative_image`("id", "creative_id", "url", "alt_text", "width", "height") SELECT "id", "creative_id", "url", "alt_text", "width", "height" FROM `creative_image`;--> statement-breakpoint
DROP TABLE `creative_image`;--> statement-breakpoint
ALTER TABLE `__new_creative_image` RENAME TO `creative_image`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `creative_image_creative_id_unique` ON `creative_image` (`creative_id`);