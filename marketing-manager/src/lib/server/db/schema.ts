import { sqliteTable, integer, text, real, uniqueIndex, foreignKey } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';
import { creativeTypes, videoPlatforms, videoFormats, videoEmotions, campaignStatuses, ageRanges, genders } from '../../components/constants'; // Import the constants

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

export const themes = sqliteTable('themes', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    title: text('title').notNull(),
    description: text('description'),
    associatedPainPoint: text('associated_pain_point'),
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

export const videoTemplates = sqliteTable('video_templates', {
    id: integer('id').primaryKey({ autoIncrement: true }),
    templateCode: text('template_code').unique(),
    name: text('name'),
    durationSeconds: integer('duration_seconds'),
    materialCount: integer('material_count'),
    aspectRatio: text('aspect_ratio', { enum: videoFormats }),
    sceneCount: integer('scene_count'),
    recommendedPlatforms: text('recommended_platforms', { mode: 'json'}),
    resolution: text('resolution'),
    previewUrl: text('preview_url'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }), // Added previously
});

// MODIFIED: Creatives Table
export const creatives = sqliteTable('creatives', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  personaId: integer('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }), // MODIFIED: Made non-nullable, cascade delete
  name: text('name').notNull(),
  type: text('type', { enum: creativeTypes }).notNull(),
  description: text('description'),
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }), // Kept nullable
  themeId: integer('theme_id').references(() => themes.id, { onDelete: 'set null' }), // Kept nullable
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
  imageUrl: text('imageUrl').notNull(), // Corrected field name based on previous file content
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
  templateId: integer('template_id').references(() => videoTemplates.id, { onDelete: 'set null' }),
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

export const themeRelations = relations(themes, ({ many }) => ({ creatives: many(creatives) }));

// Assuming strategyRelations exists
export const strategyRelations = relations(strategies, ({ one, many }) => ({
    campaign: one(campaigns, { fields: [strategies.campaignId], references: [campaigns.id] }),
    creatives: many(creatives)
}));

export const videoTemplateRelations = relations(videoTemplates, ({ many }) => ({ videoCreatives: many(creativeVideo) }));

// MODIFIED: Creative Relations
export const creativeRelations = relations(creatives, ({ one }) => ({
  persona: one(personas, { fields: [creatives.personaId], references: [personas.id] }), // Relation is now mandatory
  campaign: one(campaigns, { fields: [creatives.campaignId], references: [campaigns.id] }),
  theme: one(themes, { fields: [creatives.themeId], references: [themes.id] }),
  strategy: one(strategies, { fields: [creatives.strategyId], references: [strategies.id] }),
  textData: one(creativeText, { fields: [creatives.id], references: [creativeText.creativeId] }),
  imageData: one(creativeImage, { fields: [creatives.id], references: [creativeImage.creativeId] }),
  videoData: one(creativeVideo, { fields: [creatives.id], references: [creativeVideo.creativeId] }),
  lpData: one(creativeLp, { fields: [creatives.id], references: [creativeLp.creativeId] }),
}));

// Relations back from specific types (Unchanged)
export const creativeTextRelations = relations(creativeText, ({ one }) => ({ creative: one(creatives, { fields: [creativeText.creativeId], references: [creatives.id] }) }));
export const creativeImageRelations = relations(creativeImage, ({ one }) => ({ creative: one(creatives, { fields: [creativeImage.creativeId], references: [creatives.id] }) }));
export const creativeVideoRelations = relations(creativeVideo, ({ one }) => ({
    creative: one(creatives, { fields: [creativeVideo.creativeId], references: [creatives.id] }),
    videoTemplate: one(videoTemplates, { fields: [creativeVideo.templateId], references: [videoTemplates.id] })
}));
export const creativeLpRelations = relations(creativeLp, ({ one }) => ({ creative: one(creatives, { fields: [creativeLp.creativeId], references: [creatives.id] }) }));
