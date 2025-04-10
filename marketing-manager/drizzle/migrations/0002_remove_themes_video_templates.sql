-- Drop the themes and video_templates tables
DROP TABLE IF EXISTS `themes`;
DROP TABLE IF EXISTS `video_templates`;

-- Update the creatives table to remove the theme_id column
PRAGMA foreign_keys=OFF;
CREATE TABLE `__new_creatives` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `persona_id` integer NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `description` text,
  `campaign_id` integer,
  `strategy_id` integer,
  `design_notes` text,
  `expression_notes` text,
  `audio_notes` text,
  `created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
  `updated_at` integer,
  FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE cascade,
  FOREIGN KEY (`campaign_id`) REFERENCES `campaigns`(`id`) ON UPDATE no action ON DELETE set null,
  FOREIGN KEY (`strategy_id`) REFERENCES `strategies`(`id`) ON UPDATE no action ON DELETE set null
);

INSERT INTO `__new_creatives`(`id`, `persona_id`, `name`, `type`, `description`, `campaign_id`, `strategy_id`, `design_notes`, `expression_notes`, `audio_notes`, `created_at`, `updated_at`) 
SELECT `id`, `persona_id`, `name`, `type`, `description`, `campaign_id`, `strategy_id`, `design_notes`, `expression_notes`, `audio_notes`, `created_at`, `updated_at` FROM `creatives`;

DROP TABLE `creatives`;
ALTER TABLE `__new_creatives` RENAME TO `creatives`;

-- Update the creative_video table to remove the template_id column
CREATE TABLE `__new_creative_video` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `creative_id` integer NOT NULL,
  `videoUrl` text,
  `platform` text,
  `format` text,
  `duration` integer,
  `appeal_feature` text,
  `emotion` text,
  FOREIGN KEY (`creative_id`) REFERENCES `creatives`(`id`) ON UPDATE no action ON DELETE cascade
);

INSERT INTO `__new_creative_video`(`id`, `creative_id`, `videoUrl`, `platform`, `format`, `duration`, `appeal_feature`, `emotion`) 
SELECT `id`, `creative_id`, `videoUrl`, `platform`, `format`, `duration`, `appeal_feature`, `emotion` FROM `creative_video`;

DROP TABLE `creative_video`;
ALTER TABLE `__new_creative_video` RENAME TO `creative_video`;
CREATE UNIQUE INDEX `creative_video_creative_id_unique` ON `creative_video` (`creative_id`);

PRAGMA foreign_keys=ON;
