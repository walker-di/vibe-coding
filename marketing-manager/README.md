Okay, let's significantly enhance the plan by incorporating more specific details observed in the provided images. This will involve adding more fields to the database schema, refining UI component descriptions, clarifying workflows, and adding more context based on the visual examples.

---

**Revised & Enhanced Plan: Marketing Manager (SQLite & Svelte 5 Edition - Detailed)**

## 1. Project Overview

**(Same as before)**

**Core User Journey (Refined based on Images 4, 7-11 & User Feedback):**
1.  **Define Product/Service:** Establish the core offering the marketing efforts revolve around (Image: Step 1).
2.  **Define Target Audience (Personas) *within a Product*:** Create detailed personas, linked to a specific Product, potentially using AI assistance (Image: Step 2).
3.  **Select Creative Type *within a Persona*:** Choose to create Ad Copy, LP info, or Video info, linked to a specific Persona (Image: Step 3).
4.  **Configure Creative Details:**
    *   *For Video:* Define appeal features, desired emotion, target platform, select a theme/angle, choose a format/template.
    *   *For Copy/LP:* Define core message, potentially link to Theme.
5.  **Manage & Organize:** Assign creatives to Campaigns and Themes (cross-cutting concerns).
6.  **(Future) AI Generation/Assistance:** Generate copy suggestions, potentially video structures, etc.
7.  **(Long-term) Advanced Workflow:** Utilize deeper AI analysis, reporting, and potentially an editor interface.

## 2. Technology Stack

**(Same as before: SvelteKit, TypeScript, Drizzle ORM, SQLite, Tailwind CSS, Svelte 5 Runes, Storybook, ESLint/Prettier)**

## Current Progress (As of April 8, 2025 - Start of Refactoring)

*   **Phase 0: Foundation:**
    *   Project setup with SvelteKit, TypeScript, Tailwind CSS, Drizzle ORM, SQLite.
    *   Basic layout structure established (`src/routes/+layout.svelte`).
    *   Added global header navigation (`src/lib/components/layout/Header.svelte`) with links to major sections (Home, Campaigns, Personas, Creatives).
    *   Database schema defined (`schema.ts`) and initial database state confirmed.
*   **Phase 1 & 2: Core Entities & Detailed Personas (SPA Strategy - Pre-Refactor):**
    *   **Campaigns:** Full CRUD API & Frontend implemented.
    *   **Personas:** Full CRUD API & Frontend implemented, including detailed fields and mock AI generation. *Note: Currently standalone, needs nesting under Products.*
    *   **Creatives:** Full CRUD API & Frontend implemented, including detailed video fields and `CardSelector` UI. *Note: Currently standalone, needs nesting under Personas.*
    *   **Themes & Video Templates:** Full CRUD API & Frontend implemented.
*   **UI Refinements (Should Haves - Pre-Refactor):**
    *   Persona forms (`new`, `edit`): Gender input UI updated to remove 'Unspecified' option.
    *   Creative forms (`new`, `edit`): Video-specific fields use `CardSelector`.
    *   **Development Strategy:**
    *   Consistently using a Single-Page Application (SPA) strategy with client-side `fetch` calls to dedicated API endpoints and Svelte 5 Runes for state management.
    *   `shadcn-svelte` initialized for UI components.
*   **Refactoring Progress (Product -> Persona -> Creative Hierarchy):**
    *   Database schema updated and migrated. **(Completed)**
    *   Product API endpoints implemented. **(Completed)**
    *   Product Frontend routes (`/products/...`) implemented and refactored (View/Edit pages use simplified `$effect` logic). **(Completed)**
    *   Persona API endpoints (`/api/products/[productId]/personas/...` and `/api/products/[productId]/personas/[personaId]/...`) created. **(Completed)**
    *   Persona Frontend routes for creation (`.../new`) and viewing (`.../[personaId]`) created. **(Completed)**

## **NEW: Refactoring Plan: Product -> Persona -> Creative Hierarchy**

**(Current Task: Implement this plan)**

**Goal:** Restructure the application to enforce a strict Product -> Persona -> Creative hierarchy, aligning with the core user journey.

**Steps:**

1.  **Database Schema (`src/lib/server/db/schema.ts`):**
    *   Modify `personas` table: Make `productId` non-nullable and add `onDelete: 'cascade'`.
    *   Modify `creatives` table: Make `personaId` non-nullable and add `onDelete: 'cascade'`.
    *   Modify `products` table: Add `industry` (TEXT), `overview` (TEXT), `details` (TEXT), `featuresStrengths` (TEXT) fields (all nullable for now).
    *   **Action:** Generate and apply a new database migration. *(Database schema confirmed to be up-to-date, no migration needed)* **(Completed)**
2.  **API Endpoints:**
    *   **Products:** Implement standard CRUD endpoints:
        *   `GET, POST /api/products` **(Completed)**
        *   `GET, PUT, DELETE /api/products/[productId]` **(Completed)**
    *   **Personas:** Refactor to nest under Products: *(Next Step)*
        *   `GET, POST /api/products/[productId]/personas`
        *   `GET, PUT, DELETE /api/products/[productId]/personas/[personaId]` (Handlers must verify persona belongs to product). **(Completed)**
    *   **Creatives:** Keep top-level but enforce logic:
        *   `GET /api/creatives` (Support `?personaId=`, `?campaignId=`, `?themeId=` filters). *(Next Step)*
        *   `POST /api/creatives` (Require `personaId` in request body).
        *   `GET /api/creatives/[creativeId]`
        *   `PUT /api/creatives/[creativeId]` (Disallow changing `personaId`).
        *   `DELETE /api/creatives/[creativeId]`
3.  **Frontend Routes & UI (Fully Nested):**
    *   **Products:** Create new CRUD pages under `/products/...`. The detail page (`/products/[productId]`) and edit page (`/products/[productId]/edit`) display product info and allow editing. View/Edit pages refactored to use simplified `$effect` logic. **(Completed)**
    *   **Personas:** Create (`.../new`) and View (`.../[personaId]`) pages implemented. Edit page (`.../edit`) and listing within Product detail page need to be moved/created. *(Partially Completed)*
    *   **Creatives:** Move existing routes to `/products/[productId]/personas/[personaId]/creatives/...`. Update data loading to use `personaId`. Remove the Persona selection dropdown from forms. API calls will target `/api/creatives`. *(Following Personas)*
    *   **Navigation:** Update the main header navigation to feature `/products`. Implement breadcrumbs for nested routes. *(Partially done - Header updated, breadcrumbs pending)*
4.  **Update `README.md`:** After implementation, update this `README.md` file again to reflect the completed refactoring.

---

## 3. Phased Development Plan (Pre-Refactor State)

*Note: This section describes the state before the hierarchical refactoring. The plan above supersedes this for the current development focus.*

*   **General Notes:**
    *   **State Management:** Use Svelte 5 Runes (`$state`, `$derived`, `$effect`) consistently.
    *   **Database:** SQLite via Drizzle ORM. Remember manual `updatedAt` handling and `PRAGMA foreign_keys = ON;`.
    *   **Terminology:** Use labels/terms inspired by the images where practical (e.g., "Appeal Feature," "Stimulating Emotion").

*   **Phase 1: Foundation, Core Entities (Product, Campaign, Persona, Creative Types)**
    *   **Developer Tasks:**
        *   Setup, Layout, Shared Components (as before).
        *   **Database Schema (Initial):** `products` (basic fields), `campaigns` (basic fields), `personas` (basic fields - *no product link yet*), `creatives`, `creativeText`, `creativeImage`, `creativeVideo` (URL, platform, format, duration only), `creativeLp` (URL, headline only). Use SQLite types (Schema below).
        *   Migrations (`drizzle-kit generate:sqlite`, apply).
        *   **Product CRUD (`/products` or `/settings/products`):** Implement basic list, create, view, edit, delete for Products. *(To be implemented as part of refactoring)*
        *   **Campaign CRUD (`/campaigns/...`):** Implement basic list, create, view, edit, delete for Campaigns. *(Completed)*
        *   **Persona CRUD (`/personas/...`):** Implement basic list, create, view, edit, delete for Personas (*Name only* initially). *(Completed, but needs nesting)*
        *   **Creative CRUD (`/creatives/...`):** Implement basic list, create, view, edit, delete for the four core types. `CreativeForm` uses conditional fields. `CreativeList/Card` shows basic info. *(Completed, but needs nesting)*
        *   **Basic Linking UI:** Add simple dropdowns in `CreativeForm` to select *existing* Campaign/Persona (by ID/Name). Save `campaignId`, `personaId`. *(Implemented, but Persona link will be removed)*
        *   **No File Uploads Yet:** Store image/video URLs provided by the user.

*   **Phase 2: Detailed Persona Management, Linking & AI Assist**
    *   **Developer Tasks:**
        *   **Database Schema:** Enhance `personas` table with *all* detailed fields from Images 5 & 6. **Add `productId` foreign key (nullable). Add `insights` (TEXT) field.** *(Completed, productId made non-nullable in refactoring)*
        *   Migrations.
        *   **Persona UI (`/personas/...`):** Update `PersonaForm` and `PersonaDetailView`. Match Image 2 inputs. **Add dropdown/select to link to an existing Product.** *(Completed, Product link dropdown to be removed)*
        *   **API Updates:** Modify Persona API endpoints to handle `productId`. *(To be refactored)*
        *   **AI-Assisted Persona Generation (`PersonaForm`):** Add button, mock API (`/api/personas/generate`), populate form. *(Completed)*
        *   **Linking:** Ensure Persona selection dropdown in `CreativeForm` searches/displays detailed personas. *(To be removed)*

*   **Phase 3: Campaign Management, Themes & Strategy Foundation**
    *   **Developer Tasks:**
        *   **Database Schema:** Enhance `campaigns`. Add `themes` table. Add optional `themeId` to `creatives`. Add `strategies` table. Add optional `strategyId` to `creatives`. *(Completed, strategyId added)*
        *   Migrations.
        *   **Campaign UI (`/campaigns/...`):** Implement full CRUD. `CampaignDetailView` lists creatives/strategy. *(Completed)*
        *   **Strategy UI (Basic - Phase 3.5/S):** Add basic CRUD UI for Strategies (`/campaigns/[id]/strategy`). *(Not started)*
        *   **Theme Management (Simple):** Add basic CRUD UI (`/settings/themes`). *(Completed)*
        *   **Linking Creatives & Themes:** Add dropdown in `CreativeForm`. Save `themeId`. Display on `CreativeDetailView`. *(Completed)*

*   **Phase 4: Enhanced Video Workflow & Templates**
    *   **Developer Tasks:**
        *   **Database Schema:** Enhance `creativeVideo`. Add `videoTemplates` table. *(Completed)*
        *   Migrations.
        *   **Video Template Management (Simple):** Add basic CRUD UI (`/settings/video-templates`). *(Completed)*
        *   **Video Creative UI (`CreativeFormFieldsVideo`):** Add UI elements (`CardSelector`) for Appeal Feature, Emotion, Template. *(Completed)*
        *   **AI Copy Suggestions (`CreativeFormFieldsText`, others):** Implement button + mock API call (`/api/copy/generate`). *(Not started)*

*   **Phase 5 & Beyond (Aspirational / Long-Term R&D - Requires significant effort):**
    *   **(Same as before)**

## 4. Enhanced Database Schema (`src/lib/server/db/schema.ts` - Reflects *Target* State After Refactoring)

```typescript
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

// MODIFIED: Products Table
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
  productId: integer('product_id').notNull().references(() => products.id, { onDelete: 'cascade' }), // MODIFIED: Made non-nullable, cascade delete
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

// MODIFIED: Creatives Table
export const creatives = sqliteTable('creatives', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  personaId: integer('persona_id').notNull().references(() => personas.id, { onDelete: 'cascade' }), // MODIFIED: Made non-nullable, cascade delete
  name: text('name').notNull(),
  type: text('type', { enum: creativeTypes }).notNull(),
  description: text('description'),
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }), // Kept nullable
  themeId: integer('theme_id').references(() => themes.id, { onDelete: 'set null' }), // Kept nullable
  strategyId: integer('strategy_id').references(() => strategies.id, { onDelete: 'set null' }), // Kept nullable
  design_notes: text('design_notes'),
  expression_notes: text('expression_notes'),
  audio_notes: text('audio_notes'),
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

```

## 5. Frontend Components (`src/lib/components/`)

*   **`/shared/`**: `CardSelector.svelte`, `Icon.svelte`.
*   **`/creatives/`**: Forms/Views need updating for nested routes and removal of Persona dropdown.
*   **`/personas/`**: Forms/Views need updating for nested routes and removal of Product dropdown.
*   **`/products/`**: *(New)* Components for Product List, Detail, Form.
*   **`/campaigns/`**: No major changes planned.
*   **`/settings/`**: No major changes planned.

## 6. Sitemap / Routes (`src/routes/` - Target State After Refactoring)

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
*   `/campaigns/...` (Existing routes remain)
*   `/settings/...` (Existing routes remain)
*   *(Existing `/personas` and `/creatives` top-level routes will be removed/redirected)*

## 7. API Endpoints & Data Flow (Target State After Refactoring)

*   **Products:** `/api/products`, `/api/products/[productId]` (Standard CRUD)
*   **Personas:** `/api/products/[productId]/personas`, `/api/products/[productId]/personas/[personaId]` (Nested under Product)
*   **Creatives:** `/api/creatives`, `/api/creatives/[creativeId]` (Top-level, requires `personaId` in POST body, supports `?personaId=` filter)
*   **Campaigns, Themes, Video Templates:** Existing top-level APIs remain.
*   **Data Fetching:** Use SvelteKit layouts (`+layout.svelte`) to load parent context (Product, Persona) for nested routes. Client-side `fetch` for lists/details.
*   **Data Mutations:** Client-side `fetch` (POST, PUT, DELETE) to appropriate API endpoints. API handlers enforce relationships.
*   **Manual `updatedAt`:** Remember to manually set timestamps in API handlers.

## 8. Key Considerations for Developers

*   **(Keep existing points)**
*   **Refactoring Complexity:** Moving routes and updating API calls requires careful testing. Ensure data integrity during migration.
*   **UI/UX:** Implement clear breadcrumbs and contextual links to navigate the new hierarchy.

## 9. Getting Started (Pre-Refactor State)

**(Keep existing setup instructions)**

---

**MoSCoW Prioritization Key:**
*   **M (Must Have):** Essential for MVP launch. Core functionality cannot be omitted.
*   **S (Should Have):** Important, high-value features closely aligned with vision/images. Launch possible without, but highly desirable soon after.
*   **C (Could Have):** Desirable additions, enhancements, or more complex features for later iterations.
*   **W (Won't Have):** Features explicitly out of scope for initial development cycles due to complexity or strategic decision.

---

**(MoSCoW Table from previous README version remains largely the same, but the implementation phases are now superseded by the Refactoring Plan above)**

---
