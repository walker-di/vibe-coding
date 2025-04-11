import { sqliteTable, integer, text, real, uniqueIndex, foreignKey } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';
import { creativeTypes, videoPlatforms, videoFormats, videoEmotions, campaignStatuses, ageRanges, genders, canvasAspectRatios } from '../../constants'; // Use relative path for Drizzle Kit compatibility

// --- Core Tables ---

// NEW: Products Table (Based on Plan & Image 2)
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'), // Existing field, maybe use for 'Overview'?
  imageUrl: text('image_url'),
  industry: text('industry'), // Added
  overview: text('overview'), // Added
  details: text('details'), // Added
  featuresStrengths: text('features_strengths'), // Added
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }), // Handle updates in app logic
});

export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  goal: text('goal'),
  startDate: integer('start_date', { mode: 'timestamp_ms' }),
  endDate: integer('end_date', { mode: 'timestamp_ms' }),
  targetPlatforms: text('target_platforms'), // Comma-separated or JSON array
  status: text('status', { enum: campaignStatuses }).default('Draft'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }), // Handle updates in app logic
});

// MODIFIED: Personas Table
export const personas = sqliteTable('personas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }), // MODIFIED: Added, made non-nullable, cascade delete
  name: text('name').notNull(),
  insights: text('insights'), // Added previously
  personaTitle: text('persona_title'),
  imageUrl: text('image_url'),
  ageRangeSelection: text('age_range_selection', { enum: ageRanges }).default('Unspecified'),
  ageRangeCustom: text('age_range_custom'),
  gender: text('gender', { enum: genders }).default('Unspecified'),
  location: text('location'),
  jobTitle: text('job_title'),
  incomeLevel: text('income_level'),
  personalityTraits: text('personality_traits'),
  valuesText: text('values_text'),
  spendingHabits: text('spending_habits'),
  interestsHobbies: text('interests_hobbies'),
  lifestyle: text('lifestyle'),
  needsPainPoints: text('needs_pain_points'),
  goalsExpectations: text('goals_expectations'),
  backstory: text('backstory'),
  purchaseProcess: text('purchase_process'),
  isGenerated: integer('is_generated', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});



// Assuming strategies table exists based on README
export const strategies = sqliteTable('strategies', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    campaignId: integer('campaign_id').notNull().references(() => campaigns.id, { onDelete: 'cascade' }),
    positioning_3c: text('positioning_3c'),
    positioning_pod_pop: text('positioning_pod_pop'),
    who_insights: text('who_insights'),
    what_benefits: text('what_benefits'),
    how_appeal_axis: text('how_appeal_axis'),
    how_expression_axis: text('how_expression_axis'),
    how_media_plan: text('how_media_plan'),
    how_objectives: text('how_objectives'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});



// MODIFIED: Creatives Table
export const creatives = sqliteTable('creatives', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  personaId: integer('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }), // MODIFIED: Made non-nullable, cascade delete
  name: text('name').notNull(),
  type: text('type', { enum: creativeTypes }).notNull(),
  description: text('description'),
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }), // Kept nullable
  // themeId field removed
  strategyId: integer('strategy_id').references(() => strategies.id, { onDelete: 'set null' }), // Kept nullable (assuming exists)
  design_notes: text('design_notes'), // Added previously
  expression_notes: text('expression_notes'), // Added previously
  audio_notes: text('audio_notes'), // Added previously
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

// --- Creative Type Specific Tables --- (Unchanged)

export const creativeText = sqliteTable('creative_text', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creativeId: integer('creative_id').notNull().unique().references(() => creatives.id, { onDelete: 'cascade' }),
  headline: text('headline'),
  body: text('body').notNull(),
  callToAction: text('call_to_action'),
  appealFeature: text('appeal_feature'), // Added
  emotion: text('emotion'), // Added
  platformNotes: text('platform_notes'), // Added
});

export const creativeImage = sqliteTable('creative_image', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creativeId: integer('creative_id').notNull().unique().references(() => creatives.id, { onDelete: 'cascade' }),
  imageUrl: text('imageUrl'), // Made optional by removing notNull()
  altText: text('alt_text'),
  width: integer('width'),
  height: integer('height'),
  appealFeature: text('appeal_feature'), // Added
  emotion: text('emotion'), // Added
  platformNotes: text('platform_notes'), // Added
});

export const creativeVideo = sqliteTable('creative_video', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creativeId: integer('creative_id').notNull().unique().references(() => creatives.id, { onDelete: 'cascade' }),
  videoUrl: text('videoUrl'), // Corrected field name based on previous file content
  platform: text('platform', { enum: videoPlatforms }),
  format: text('format', { enum: videoFormats }),
  duration: integer('duration'),
  appealFeature: text('appeal_feature'),
  emotion: text('emotion', { enum: videoEmotions }),
  // templateId field removed
});

export const creativeLp = sqliteTable('creative_lp', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creativeId: integer('creative_id').notNull().unique().references(() => creatives.id, { onDelete: 'cascade' }),
  pageUrl: text('pageUrl').notNull(), // Corrected field name based on previous file content
  headline: text('headline'),
  keySections: text('key_sections', { mode: 'json' }),
  appealFeature: text('appeal_feature'), // Added
  emotion: text('emotion'), // Added
  platformNotes: text('platform_notes'), // Added
});

// --- Story Feature Tables ---

export const stories = sqliteTable('stories', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creativeId: integer('creative_id').notNull().references(() => creatives.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  description: text('description'),
  aspectRatio: text('aspect_ratio', { enum: canvasAspectRatios }).default('16:9'), // Added
  resolution: text('resolution'), // Added - Store as text (e.g., "1920x1080", "Custom")
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export const scenes = sqliteTable('scenes', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  storyId: integer('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  bgmUrl: text('bgm_url'),
  bgmName: text('bgm_name'),
  description: text('description'),
  orderIndex: integer('order_index').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export const clips = sqliteTable('clips', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  sceneId: integer('scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  canvas: text('canvas').notNull(), // JSON string for fabric.js data
  imageUrl: text('image_url'), // URL for the generated preview image
  narration: text('narration'),
  narrationAudioUrl: text('narration_audio_url'), // URL for the generated narration audio
  voiceName: text('voice_name'), // Voice used for narration audio
  description: text('description'),
  duration: integer('duration'), // Duration in milliseconds
  orderIndex: integer('order_index').notNull(),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

// NEW: Canvas Templates Table
export const canvasTemplates = sqliteTable('canvas_templates', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  aspectRatio: text('aspect_ratio', { enum: canvasAspectRatios }).default('16:9'), // Added
  resolution: text('resolution'), // Added - Store as text (e.g., "1920x1080", "Custom")
  canvasData: text('canvas_data').notNull(), // JSON string for fabric.js data
  previewImageUrl: text('preview_image_url'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});


// --- Relations ---

// NEW: Product Relations
export const productRelations = relations(products, ({ many }) => ({
    personas: many(personas)
}));

export const campaignRelations = relations(campaigns, ({ one, many }) => ({
    strategy: one(strategies, { fields: [campaigns.id], references: [strategies.campaignId] }),
    creatives: many(creatives)
}));

// MODIFIED: Persona Relations
export const personaRelations = relations(personas, ({ one, many }) => ({
  product: one(products, { fields: [personas.productId], references: [products.id] }), // Added link to product
  creatives: many(creatives)
}));

// Assuming strategyRelations exists
export const strategyRelations = relations(strategies, ({ one, many }) => ({
    campaign: one(campaigns, { fields: [strategies.campaignId], references: [campaigns.id] }),
    creatives: many(creatives)
}));

// MODIFIED: Creative Relations
export const creativeRelations = relations(creatives, ({ one, many }) => ({
  persona: one(personas, { fields: [creatives.personaId], references: [personas.id] }), // Relation is now mandatory
  campaign: one(campaigns, { fields: [creatives.campaignId], references: [campaigns.id] }),
  // theme relation removed
  strategy: one(strategies, { fields: [creatives.strategyId], references: [strategies.id] }),
  textData: one(creativeText, { fields: [creatives.id], references: [creativeText.creativeId] }),
  imageData: one(creativeImage, { fields: [creatives.id], references: [creativeImage.creativeId] }),
  videoData: one(creativeVideo, { fields: [creatives.id], references: [creativeVideo.creativeId] }),
  lpData: one(creativeLp, { fields: [creatives.id], references: [creativeLp.creativeId] }),
  stories: many(stories) // Add stories relation
}));

// Relations back from specific types (Unchanged)
export const creativeTextRelations = relations(creativeText, ({ one }) => ({ creative: one(creatives, { fields: [creativeText.creativeId], references: [creatives.id] }) }));
export const creativeImageRelations = relations(creativeImage, ({ one }) => ({ creative: one(creatives, { fields: [creativeImage.creativeId], references: [creatives.id] }) }));
export const creativeVideoRelations = relations(creativeVideo, ({ one }) => ({
    creative: one(creatives, { fields: [creativeVideo.creativeId], references: [creatives.id] }),
    // videoTemplate relation removed
}));
export const creativeLpRelations = relations(creativeLp, ({ one }) => ({ creative: one(creatives, { fields: [creativeLp.creativeId], references: [creatives.id] }) }));

// Story feature relations
export const storyRelations = relations(stories, ({ one, many }) => ({
  creative: one(creatives, { fields: [stories.creativeId], references: [creatives.id] }),
  scenes: many(scenes)
}));

export const sceneRelations = relations(scenes, ({ one, many }) => ({
  story: one(stories, { fields: [scenes.storyId], references: [stories.id] }),
  clips: many(clips)
}));

export const clipRelations = relations(clips, ({ one }) => ({
  scene: one(scenes, { fields: [clips.sceneId], references: [scenes.id] })
}));

// Scene transitions table
export const sceneTransitions = sqliteTable('scene_transitions', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fromSceneId: integer('from_scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  toSceneId: integer('to_scene_id').notNull().references(() => scenes.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // 'Fade', 'Slide', 'Zoom', 'Wipe', 'None'
  duration: integer('duration').notNull(), // Duration in milliseconds
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

// Scene transitions relations
export const sceneTransitionsRelations = relations(sceneTransitions, ({ one }) => ({
  fromScene: one(scenes, { fields: [sceneTransitions.fromSceneId], references: [scenes.id] }),
  toScene: one(scenes, { fields: [sceneTransitions.toSceneId], references: [scenes.id] })
}));

// NEW: Canvas Template Relations (currently none needed, but good practice to define)
export const canvasTemplateRelations = relations(canvasTemplates, () => ({
  // No direct relations needed for now
}));
