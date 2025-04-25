-- Add audio settings fields to stories table
ALTER TABLE stories ADD COLUMN narration_volume REAL DEFAULT 1.0;
ALTER TABLE stories ADD COLUMN bgm_volume REAL DEFAULT 0.5;
ALTER TABLE stories ADD COLUMN narration_speed REAL DEFAULT 1.0;
