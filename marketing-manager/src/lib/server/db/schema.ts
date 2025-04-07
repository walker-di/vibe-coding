import { sqliteTable, integer, text, real, uniqueIndex, foreignKey } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';

// Enums (as const arrays for reference)
export const creativeTypes = ['text', 'image', 'video', 'lp'] as const;
export const videoPlatforms = ['YouTube', 'Facebook', 'Instagram', 'TikTok', 'LINE', 'YDA', 'X(Twitter)', 'WebSite', 'Signage', 'Other'] as const; // Expanded from Image 12
export const videoFormats = ['16:9', '9:16', '1:1', '4:5', '1.91:1', 'Other'] as const;
export const videoEmotions = ['Heartwarming', 'Anxious', 'Calm', 'Awe', 'Energetic', 'Unspecified'] as const; // Simplified mapping from Image 8
export const campaignStatuses = ['Draft', 'Active', 'Completed', 'Archived'] as const;
export const ageRanges = ['Unspecified', '10s', '20s', '30s', '40s', '50s', '60s', '70+', 'Custom'] as const; // From Image 2
export const genders = ['Unspecified', 'Male', 'Female'] as const; // From Image 2

// --- Core Tables ---

export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  goal: text('goal'),
  startDate: integer('start_date', { mode: 'timestamp_ms' }),
  endDate: integer('end_date', { mode: 'timestamp_ms' }),
  targetPlatforms: text('target_platforms'), // Comma-separated or JSON array
  status: text('status', { enum: campaignStatuses }).default('Draft'),
  // Potential future fields (Phase 5): productId, positioningNotes, budget
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }), // Handle updates in app logic
});

export const personas = sqliteTable('personas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  // Core Info (Image 5)
  name: text('name').notNull(),
  personaTitle: text('persona_title'),
  imageUrl: text('image_url'),
  // Demographics (Image 2, 5)
  ageRangeSelection: text('age_range_selection', { enum: ageRanges }).default('Unspecified'),
  ageRangeCustom: text('age_range_custom'), // For text input like "20-45歳"
  gender: text('gender', { enum: genders }).default('Unspecified'),
  location: text('location'),
  jobTitle: text('job_title'),
  incomeLevel: text('income_level'),
  // Psychographics (Image 6)
  personalityTraits: text('personality_traits'),
  valuesText: text('values_text'), // Renamed from 'values' to avoid SQL keyword conflicts
  spendingHabits: text('spending_habits'),
  interestsHobbies: text('interests_hobbies'),
  lifestyle: text('lifestyle'), // "Holiday Spending" / 休日の過ごし方
  // Needs & Goals (Image 5)
  needsPainPoints: text('needs_pain_points'),
  goalsExpectations: text('goals_expectations'), // "Expectations for Solution" / 解決策への期待
  // Story & Behavior (Image 6)
  backstory: text('backstory'),
  purchaseProcess: text('purchase_process'),
  // Meta
  isGenerated: integer('is_generated', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }), // Handle updates in app logic
});

// Added in Phase 3
export const themes = sqliteTable('themes', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(), // Theme Title from Image 9
    description: text('description'), // Description from Image 9
    associatedPainPoint: text('associated_pain_point'), // Pain Point from Image 9
    // Potential future fields: targetIndustry, associatedBenefit
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
});

// Added in Phase 4
export const videoTemplates = sqliteTable('video_templates', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    templateCode: text('template_code').unique(), // e.g., "02766[正]" (Image 12)
    name: text('name'),
    durationSeconds: integer('duration_seconds'), // "尺" (Image 12)
    materialCount: integer('material_count'), // "素材数" (Image 12)
    aspectRatio: text('aspect_ratio', { enum: videoFormats }), // "比率" (Image 12)
    sceneCount: integer('scene_count'), // "シーン数" (Image 12)
    recommendedPlatforms: text('recommended_platforms', { mode: 'json'}), // "推奨配信先" (Image 12) - Store as JSON array
    resolution: text('resolution'), // "解像度" (Image 12)
    previewUrl: text('preview_url'), // Link to preview image/video
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
});


export const creatives = sqliteTable('creatives', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  type: text('type', { enum: creativeTypes }).notNull(),
  description: text('description'),
  // Linking
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  personaId: integer('persona_id').references(() => personas.id, { onDelete: 'set null' }),
  themeId: integer('theme_id').references(() => themes.id, { onDelete: 'set null' }), // Added Phase 3
  // Meta
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }), // Handle updates in app logic
});

// --- Creative Type Specific Tables ---

export const creativeText = sqliteTable('creative_text', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creativeId: integer('creative_id').notNull().unique().references(() => creatives.id, { onDelete: 'cascade' }),
  headline: text('headline'),
  body: text('body').notNull(),
  callToAction: text('call_to_action'),
});

export const creativeImage = sqliteTable('creative_image', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creativeId: integer('creative_id').notNull().unique().references(() => creatives.id, { onDelete: 'cascade' }),
  imageUrl: text('url').notNull(), // Changed from 'url' to 'imageUrl' for consistency
  altText: text('alt_text'),
  width: integer('width'),
  height: integer('height'),
});

export const creativeVideo = sqliteTable('creative_video', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creativeId: integer('creative_id').notNull().unique().references(() => creatives.id, { onDelete: 'cascade' }),
  videoUrl: text('url'), // Changed from 'url' to 'videoUrl' for consistency
  platform: text('platform', { enum: videoPlatforms }), // From Image 10/12 dropdown/recommendations
  format: text('format', { enum: videoFormats }), // Aspect Ratio, potentially derived from template
  duration: integer('duration'), // in seconds, potentially derived from template
  // Phase 4 Additions
  appealFeature: text('appeal_feature'), // From Image 8 Radio Buttons (Store selected text, maybe JSON if multiple)
  emotion: text('emotion', { enum: videoEmotions }), // From Image 8 cards
  templateId: integer('template_id').references(() => videoTemplates.id, { onDelete: 'set null' }), // Link to selected template (Image 11)
});

export const creativeLp = sqliteTable('creative_lp', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creativeId: integer('creative_id').notNull().unique().references(() => creatives.id, { onDelete: 'cascade' }),
  pageUrl: text('url').notNull(), // Changed from 'url' to 'pageUrl' for consistency
  headline: text('headline'),
  keySections: text('key_sections', { mode: 'json' }), // Store array [{title: 'Hero'}, {title: 'Features'}]
});

// --- Relations ---
// (Define relations using Drizzle `relations` helper for all tables, including new ones like themes and videoTemplates linking back to creatives where appropriate)
export const campaignRelations = relations(campaigns, ({ many }) => ({ creatives: many(creatives) }));
export const personaRelations = relations(personas, ({ many }) => ({ creatives: many(creatives) }));
export const themeRelations = relations(themes, ({ many }) => ({ creatives: many(creatives) }));
export const videoTemplateRelations = relations(videoTemplates, ({ many }) => ({ videoCreatives: many(creativeVideo) })); // A template can be used by many videos

export const creativeRelations = relations(creatives, ({ one }) => ({
  campaign: one(campaigns, { fields: [creatives.campaignId], references: [campaigns.id] }),
  persona: one(personas, { fields: [creatives.personaId], references: [personas.id] }),
  theme: one(themes, { fields: [creatives.themeId], references: [themes.id] }),
  // One-to-one for specific types
  textData: one(creativeText, { fields: [creatives.id], references: [creativeText.creativeId] }),
  imageData: one(creativeImage, { fields: [creatives.id], references: [creativeImage.creativeId] }),
  videoData: one(creativeVideo, { fields: [creatives.id], references: [creativeVideo.creativeId] }),
  lpData: one(creativeLp, { fields: [creatives.id], references: [creativeLp.creativeId] }),
}));

// Add relations back from specific types to creatives and video templates
export const creativeTextRelations = relations(creativeText, ({ one }) => ({ creative: one(creatives, { fields: [creativeText.creativeId], references: [creatives.id] }) }));
export const creativeImageRelations = relations(creativeImage, ({ one }) => ({ creative: one(creatives, { fields: [creativeImage.creativeId], references: [creatives.id] }) }));
export const creativeVideoRelations = relations(creativeVideo, ({ one }) => ({
    creative: one(creatives, { fields: [creativeVideo.creativeId], references: [creatives.id] }),
    videoTemplate: one(videoTemplates, { fields: [creativeVideo.templateId], references: [videoTemplates.id] })
}));
export const creativeLpRelations = relations(creativeLp, ({ one }) => ({ creative: one(creatives, { fields: [creativeLp.creativeId], references: [creatives.id] }) }));
