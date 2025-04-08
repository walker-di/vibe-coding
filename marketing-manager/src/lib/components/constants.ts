export const creativeTypes = ['text', 'image', 'video', 'lp'] as const;
export const videoPlatforms = ['YouTube', 'Facebook', 'Instagram', 'TikTok', 'LINE', 'YDA', 'X(Twitter)', 'WebSite', 'Signage', 'Other'] as const; // Expanded from Image 12
export const videoFormats = ['16:9', '9:16', '1:1', '4:5', '1.91:1', 'Other'] as const;
export const videoEmotions = ['Heartwarming', 'Anxious', 'Calm', 'Awe', 'Energetic', 'Unspecified'] as const; // Simplified mapping from Image 8
export const campaignStatuses = ['Draft', 'Active', 'Completed', 'Archived'] as const;
export const ageRanges = ['Unspecified', '10s', '20s', '30s', '40s', '50s', '60s', '70+', 'Custom'] as const; // From Image 2
export const genders = ['Unspecified', 'Male', 'Female'] as const; // From Image 2
export const appealFeatures = ['Product Feature Focus', 'Benefit Focus', 'Problem/Solution', 'Testimonial/Social Proof', 'Comparison', 'Storytelling', 'Humor', 'Educational'] as const;
