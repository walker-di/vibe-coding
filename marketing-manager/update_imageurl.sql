PRAGMA foreign_keys=OFF;

-- Create a new table with the updated schema
CREATE TABLE `__new_creative_image` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`creative_id` integer NOT NULL,
	`imageUrl` text, -- Changed from NOT NULL to allow NULL
	`alt_text` text,
	`width` integer,
	`height` integer,
	`appeal_feature` text,
	`emotion` text,
	`platform_notes` text,
	FOREIGN KEY (`creative_id`) REFERENCES `creatives`(`id`) ON UPDATE no action ON DELETE cascade
);

-- Copy data from the old table to the new one
INSERT INTO `__new_creative_image`("id", "creative_id", "imageUrl", "alt_text", "width", "height", "appeal_feature", "emotion", "platform_notes") 
SELECT "id", "creative_id", "imageUrl", "alt_text", "width", "height", "appeal_feature", "emotion", "platform_notes" 
FROM `creative_image`;

-- Drop the old table
DROP TABLE `creative_image`;

-- Rename the new table to the original name
ALTER TABLE `__new_creative_image` RENAME TO `creative_image`;

-- Recreate the unique index
CREATE UNIQUE INDEX `creative_image_creative_id_unique` ON `creative_image` (`creative_id`);

PRAGMA foreign_keys=ON;
