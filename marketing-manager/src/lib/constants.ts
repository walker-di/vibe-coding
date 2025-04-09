// Enums/Constants shared between server and client

export const creativeTypes = ['text', 'image', 'video', 'lp'] as const;
export type CreativeType = typeof creativeTypes[number];

export const videoPlatforms = ['YouTube', 'Facebook', 'Instagram', 'TikTok', 'LINE', 'YDA', 'X(Twitter)', 'WebSite', 'Signage', 'Other'] as const;
export type VideoPlatform = typeof videoPlatforms[number];

export const videoFormats = ['16:9', '9:16', '1:1', '4:5', '1.91:1', 'Other'] as const;
export type VideoFormat = typeof videoFormats[number];

export const videoEmotions = ['Heartwarming', 'Anxious', 'Calm', 'Awe', 'Energetic', 'Unspecified'] as const;
export type VideoEmotion = typeof videoEmotions[number];

export const campaignStatuses = ['Draft', 'Active', 'Completed', 'Archived'] as const;
export type CampaignStatus = typeof campaignStatuses[number];

export const ageRanges = ['Unspecified', '10s', '20s', '30s', '40s', '50s', '60s', '70+', 'Custom'] as const;
export type AgeRange = typeof ageRanges[number];

export const genders = ['Unspecified', 'Male', 'Female'] as const;
export type Gender = typeof genders[number];

// Example options for UI elements that might not directly map to strict enums in DB
export const appealFeatures = ['Product Feature Focus', 'Benefit Focus', 'Problem/Solution', 'Testimonial/Social Proof', 'Comparison', 'Storytelling', 'Humor', 'Educational'] as const;
export type AppealFeature = typeof appealFeatures[number];

// Canvas/Image Resolutions (Examples)
export const commonResolutions = ['1920x1080 (16:9 HD)', '1080x1920 (9:16 HD)', '1080x1080 (1:1 Square)', '1200x628 (Landscape Ad)', '1080x1350 (4:5 Portrait)', 'Custom'] as const;
export type CommonResolution = typeof commonResolutions[number];

// Re-using videoFormats for Canvas Aspect Ratios for now
export const canvasAspectRatios = videoFormats;
export type CanvasAspectRatio = VideoFormat;
