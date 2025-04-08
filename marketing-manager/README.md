# Marketing Manager (SQLite & Svelte 5 Edition)

## 1. Project Overview

A web application built with SvelteKit to manage marketing assets like campaigns, target personas, and creatives (ad copy, images, videos, landing pages). It aims to streamline the marketing workflow and incorporates AI assistance for generating and editing product details.

**Core User Journey:**
1.  **Define Product/Service:** Establish the core offering.
2.  **Define Target Audience (Personas) *within a Product*:** Create detailed personas linked to a specific Product.
3.  **Manage Campaigns:** Create and organize marketing campaigns.
4.  **Manage Creatives *within a Persona*:** Create Ad Copy, LP info, or Video info, linked to a specific Persona. Assign creatives to Campaigns and Themes.
5.  **Manage Settings:** Configure reusable Themes and Video Templates.

## 2. Technology Stack

*   **Framework:** SvelteKit
*   **Language:** TypeScript
*   **UI:** Tailwind CSS, shadcn-svelte (UI components)
*   **State Management:** Svelte 5 Runes (`$state`, `$derived`, `$effect`)
*   **Database:** SQLite
*   **ORM:** Drizzle ORM
*   **Linting/Formatting:** ESLint, Prettier
*   **Component Library (Optional):** Storybook

## 3. Current Status (As of April 8, 2025 - Post-Refactoring)

*   **Foundation:** Project setup complete. Basic layout and header navigation established.
*   **Core Entities:** Full CRUD APIs and Frontend routes implemented for Products, Campaigns, Personas, Creatives, Themes, and Video Templates.
*   **Hierarchy:** Product -> Persona -> Creative relationship enforced in database schema and relevant API/Frontend routes.
*   **Refactoring (Completed):**
    *   **Shared Form Components:** Created and implemented reusable form components (`...Form.svelte`) for Campaigns, Personas, Products, Themes, and Video Templates, significantly reducing code duplication in `new` and `edit` pages.
    *   **Shared Detail View Components:** Created/verified shared detail view components (`...DetailView.svelte`) for Campaigns, Personas, Creatives, and Products, centralizing display logic.
    *   **Type Organization:** Moved shared TypeScript types for Products, Themes, and Video Templates into dedicated files within `src/lib/types/`.
    *   **Svelte 5:** Consistently using Svelte 5 Runes for state management.
    *   **Data Fetching:** Primarily using client-side `$effect` hooks with `fetch` for data loading in list/detail pages. Edit pages utilize SvelteKit's server `load` function. Form submissions use client-side fetch or SvelteKit form actions.
*   **UI:** Basic UI implemented using `shadcn-svelte` components. `CardSelector` used for specific video creative fields.
*   **AI Assistance:** Integrated Google Gemini via a backend API (`/api/products/generate`) and a reusable frontend dialog (`AiGenerationDialog.svelte`) to generate or edit product details based on user instructions and current form data.

## 4. Key Architectural Decisions & Patterns

*   **Component-Based Refactoring:** Prioritized creating reusable components (`...Form.svelte`, `...DetailView.svelte`) in `src/lib/components/` to handle common UI and logic for different entities, reducing duplication in route pages (`src/routes/...`).
*   **Type Safety:** Leveraged TypeScript and Drizzle ORM's inferred types. Centralized shared types in `src/lib/types/` for better organization.
*   **Data Fetching Strategy:**
    *   **Client-side (`$effect` + `fetch`):** Used for most list and detail pages for simplicity and SPA-like behavior.
    *   **Server-side (`load` + form actions):** Used for edit pages where server-side data loading and form handling provide benefits (e.g., Campaign edit, potentially Product edit in future).
*   **State Management:** Svelte 5 Runes (`$state`, `$derived`, `$effect`) used for reactive state within components and pages.
*   **AI Integration:** Backend API endpoint handles communication with the external AI service (Gemini), keeping API keys and complex logic server-side. A reusable frontend component provides the user interface for interaction.

## 5. Database Schema (`src/lib/server/db/schema.ts`)

*(Schema definition remains the same as the target state described previously, reflecting the Product -> Persona -> Creative hierarchy)*

```typescript
import { sqliteTable, integer, text, real, uniqueIndex, foreignKey } from 'drizzle-orm/sqlite-core';
import { relations, sql } from 'drizzle-orm';
import { creativeTypes, videoPlatforms, videoFormats, videoEmotions, campaignStatuses, ageRanges, genders } from '$lib/components/constants';

// --- Core Tables ---
export const products = sqliteTable('products', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  description: text('description'),
  imageUrl: text('image_url'),
  industry: text('industry'),
  overview: text('overview'),
  details: text('details'),
  featuresStrengths: text('features_strengths'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export const campaigns = sqliteTable('campaigns', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  name: text('name').notNull(),
  goal: text('goal'),
  startDate: integer('start_date', { mode: 'timestamp_ms' }),
  endDate: integer('end_date', { mode: 'timestamp_ms' }),
  targetPlatforms: text('target_platforms'),
  status: text('status', { enum: campaignStatuses }).default('Draft'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export const personas = sqliteTable('personas', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  insights: text('insights'),
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
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
});

export const creatives = sqliteTable('creatives', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  personaId: integer('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  type: text('type', { enum: creativeTypes }).notNull(),
  description: text('description'),
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }),
  themeId: integer('theme_id').references(() => themes.id, { onDelete: 'set null' }),
  strategyId: integer('strategy_id').references(() => strategies.id, { onDelete: 'set null' }),
  design_notes: text('design_notes'),
  expression_notes: text('expression_notes'),
  audio_notes: text('audio_notes'),
  createdAt: integer('created_at', { mode: 'timestamp_ms' }).default(sql`(unixepoch('now') * 1000)`).notNull(),
  updatedAt: integer('updated_at', { mode: 'timestamp_ms' }),
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
  imageUrl: text('imageUrl').notNull(),
  altText: text('alt_text'),
  width: integer('width'),
  height: integer('height'),
});

export const creativeVideo = sqliteTable('creative_video', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creativeId: integer('creative_id').notNull().unique().references(() => creatives.id, { onDelete: 'cascade' }),
  videoUrl: text('videoUrl'),
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
  pageUrl: text('pageUrl').notNull(),
  headline: text('headline'),
  keySections: text('key_sections', { mode: 'json' }),
});

// --- Relations ---

export const productRelations = relations(products, ({ many }) => ({
    personas: many(personas)
}));

export const campaignRelations = relations(campaigns, ({ one, many }) => ({
    strategy: one(strategies, { fields: [campaigns.id], references: [strategies.campaignId] }),
    creatives: many(creatives)
}));

export const personaRelations = relations(personas, ({ one, many }) => ({
  product: one(products, { fields: [personas.productId], references: [products.id] }),
  creatives: many(creatives)
}));

export const themeRelations = relations(themes, ({ many }) => ({ creatives: many(creatives) }));

export const strategyRelations = relations(strategies, ({ one, many }) => ({
    campaign: one(campaigns, { fields: [strategies.campaignId], references: [campaigns.id] }),
    creatives: many(creatives)
}));

export const videoTemplateRelations = relations(videoTemplates, ({ many }) => ({ videoCreatives: many(creativeVideo) }));

export const creativeRelations = relations(creatives, ({ one }) => ({
  persona: one(personas, { fields: [creatives.personaId], references: [personas.id] }),
  campaign: one(campaigns, { fields: [creatives.campaignId], references: [campaigns.id] }),
  theme: one(themes, { fields: [creatives.themeId], references: [themes.id] }),
  strategy: one(strategies, { fields: [creatives.strategyId], references: [strategies.id] }),
  textData: one(creativeText, { fields: [creatives.id], references: [creativeText.creativeId] }),
  imageData: one(creativeImage, { fields: [creatives.id], references: [creativeImage.creativeId] }),
  videoData: one(creativeVideo, { fields: [creatives.id], references: [creativeVideo.creativeId] }),
  lpData: one(creativeLp, { fields: [creatives.id], references: [creativeLp.creativeId] }),
}));

export const creativeTextRelations = relations(creativeText, ({ one }) => ({ creative: one(creatives, { fields: [creativeText.creativeId], references: [creatives.id] }) }));
export const creativeImageRelations = relations(creativeImage, ({ one }) => ({ creative: one(creatives, { fields: [creativeImage.creativeId], references: [creatives.id] }) }));
export const creativeVideoRelations = relations(creativeVideo, ({ one }) => ({
    creative: one(creatives, { fields: [creativeVideo.creativeId], references: [creatives.id] }),
    videoTemplate: one(videoTemplates, { fields: [creativeVideo.templateId], references: [videoTemplates.id] })
}));
export const creativeLpRelations = relations(creativeLp, ({ one }) => ({ creative: one(creatives, { fields: [creativeLp.creativeId], references: [creatives.id] }) }));
```

## 6. Frontend Components (`src/lib/components/`)

*   **`/shared/`**: `CardSelector.svelte`.
*   **`/creatives/`**: `CreativeForm.svelte`, `CreativeDetailView.svelte`.
*   **`/personas/`**: `PersonaForm.svelte`, `PersonaDetailView.svelte`.
*   **`/products/`**: `ProductForm.svelte`, `ProductDetailView.svelte`.
*   **`/campaigns/`**: `CampaignForm.svelte`, `CampaignDetailView.svelte`.
*   **`/settings/`**: `ThemeForm.svelte`, `VideoTemplateForm.svelte`.
*   **`/layout/`**: `Header.svelte`.

## 7. Sitemap / Routes (`src/routes/`)

*   `/products` (List)
*   `/products/new` (Create Form)
*   `/products/[productId]` (Detail View - lists Personas)
*   `/products/[productId]/edit` (Edit Form)
*   `/products/[productId]/personas/new` (Create Form)
*   `/products/[productId]/personas/[personaId]` (Detail View - lists Creatives)
*   `/products/[productId]/personas/[personaId]/edit` (Edit Form)
*   `/products/[productId]/personas/[personaId]/creatives/new` (Create Form)
*   `/products/[productId]/personas/[personaId]/creatives/[creativeId]` (Detail View)
*   `/products/[productId]/personas/[personaId]/creatives/[creativeId]/edit` (Edit Form)
*   `/personas` (List - *Likely active based on errors*)
*   `/personas/new` (Create Form - *Likely active based on errors*)
*   `/personas/[id]` (Detail View - *Likely active based on errors*)
*   `/personas/[id]/edit` (Edit Form - *Likely active based on errors*)
*   `/creatives` (List - *Likely active based on errors*)
*   `/creatives/new` (Create Form - *Likely active based on errors*)
*   `/creatives/[id]` (Detail View - *Likely active based on errors*)
*   `/creatives/[id]/edit` (Edit Form - *Likely active based on errors*)
*   `/campaigns` (List)
*   `/campaigns/new` (Create Form)
*   `/campaigns/[id]` (Detail View)
*   `/campaigns/[id]/edit` (Edit Form)
*   `/settings` (Index)
*   `/settings/themes` (List)
*   `/settings/themes/new` (Create Form)
*   `/settings/themes/[id]/edit` (Edit Form)
*   `/settings/video-templates` (List)
*   `/settings/video-templates/new` (Create Form)
*   `/settings/video-templates/[id]/edit` (Edit Form)
*   *(Note: Top-level `/personas` and `/creatives` routes seem active despite previous intention to remove)*

## 8. API Endpoints & Data Flow

*   **Products:** `/api/products`, `/api/products/[productId]`, `/api/products/generate` (POST for AI generation/editing)
*   **Personas:** `/api/products/[productId]/personas`, `/api/products/[productId]/personas/[personaId]`
*   **Creatives:** `/api/creatives`, `/api/creatives/[creativeId]` (Requires `personaId` in POST body, supports `?personaId=` filter)
*   **Campaigns:** `/api/campaigns`, `/api/campaigns/[id]`
*   **Themes:** `/api/themes`, `/api/themes/[id]`
*   **Video Templates:** `/api/video-templates`, `/api/video-templates/[id]`
*   **Data Fetching:** Primarily client-side `fetch` in `$effect` or `onMount`. Server `load` used in Campaign/Product edit pages.
*   **Data Mutations:** Client-side `fetch` or SvelteKit form actions.

## 9. Getting Started

1.  **Clone the repository.**
2.  **Install dependencies:** `npm install`
3.  **Environment Variables:** Copy `.env.example` to `.env`. You **must** add your `GEMINI_API_KEY` for the AI product generation feature to work. Configure other variables like the database path if needed.
4.  **Database Setup:**
    *   Run migrations: `npx drizzle-kit generate:sqlite` (if schema changes) followed by `node scripts/migrate.mjs` (or your migration script).
    *   Ensure `PRAGMA foreign_keys = ON;` is active for SQLite.
5.  **Run Development Server:** `npm run dev`
6.  **Open:** `http://localhost:5173` (or your configured port).
