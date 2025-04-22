-- Update audio settings for existing stories
UPDATE stories SET bgm_volume = 0.09 WHERE bgm_volume = 0.5;
UPDATE stories SET narration_speed = 1.1 WHERE narration_speed = 1.0;
