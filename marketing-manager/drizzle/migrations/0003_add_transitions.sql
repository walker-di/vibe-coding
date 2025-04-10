-- Add transitions table
CREATE TABLE `scene_transitions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `from_scene_id` integer NOT NULL,
  `to_scene_id` integer NOT NULL,
  `type` text NOT NULL,
  `duration` integer NOT NULL,
  `created_at` integer DEFAULT (unixepoch('now') * 1000) NOT NULL,
  `updated_at` integer,
  FOREIGN KEY (`from_scene_id`) REFERENCES `scenes` (`id`) ON DELETE CASCADE,
  FOREIGN KEY (`to_scene_id`) REFERENCES `scenes` (`id`) ON DELETE CASCADE
);

-- Add index for faster lookups
CREATE INDEX `idx_scene_transitions_scenes` ON `scene_transitions` (`from_scene_id`, `to_scene_id`);
