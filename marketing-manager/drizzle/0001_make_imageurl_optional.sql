PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_creative_image` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creative_id` integer NOT NULL,
	`imageUrl` text,
	`alt_text` text,
	`width` integer,
	`height` integer,
	`appeal_feature` text,
	`emotion` text,
	`platform_notes` text,
	FOREIGN KEY (`creative_id`) REFERENCES `creatives`(`id`) ON UPDATE no action ON DELETE cascade
);--> statement-breakpoint
INSERT INTO `__new_creative_image`("id", "creative_id", "imageUrl", "alt_text", "width", "height", "appeal_feature", "emotion", "platform_notes") SELECT "id", "creative_id", "imageUrl", "alt_text", "width", "height", "appeal_feature", "emotion", "platform_notes" FROM `creative_image`;--> statement-breakpoint
DROP TABLE `creative_image`;--> statement-breakpoint
ALTER TABLE `__new_creative_image` RENAME TO `creative_image`;--> statement-breakpoint
CREATE UNIQUE INDEX `creative_image_creative_id_unique` ON `creative_image` (`creative_id`);--> statement-breakpoint
PRAGMA foreign_keys=ON;
