CREATE TABLE `storyboards` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text DEFAULT 'Untitled Storyboard' NOT NULL,
	`created_at` integer DEFAULT (unixepoch('subsec') * 1000) NOT NULL
);
--> statement-breakpoint
ALTER TABLE `storyboard_frames` ADD `storyboard_id` text NOT NULL REFERENCES storyboards(id);--> statement-breakpoint
ALTER TABLE `storyboard_frames` ADD `narration_audio_url` text;--> statement-breakpoint
ALTER TABLE `storyboard_frames` ADD `frame_order` integer DEFAULT 0 NOT NULL;