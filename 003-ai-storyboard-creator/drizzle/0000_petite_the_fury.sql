CREATE TABLE `storyboard_frames` (
	`id` text PRIMARY KEY NOT NULL,
	`title` text,
	`main_image_prompt` text NOT NULL,
	`background_image_prompt` text NOT NULL,
	`bgm_prompt` text NOT NULL,
	`narration` text NOT NULL,
	`main_image_url` text,
	`background_image_url` text,
	`bgm_url` text,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
