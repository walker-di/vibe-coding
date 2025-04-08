Okay, let's significantly enhance the plan by incorporating more specific details observed in the provided images. This will involve adding more fields to the database schema, refining UI component descriptions, clarifying workflows, and adding more context based on the visual examples.

---

**Revised & Enhanced Plan: Marketing Manager (SQLite & Svelte 5 Edition - Detailed)**

## 1. Project Overview

**(Same as before)**

**Core User Journey (Refined based on Images 4, 7-11):**
1.  **(Optional/Implicit) Define Product/Service:** (Context for everything, maybe part of Campaign setup initially).
2.  **Define Target Audience (Personas):** Create detailed personas, potentially using AI assistance (Image 2, 5, 6).
3.  **Select Creative Type:** Choose to create Ad Copy, LP info, or Video info (Image 7).
4.  **Configure Creative Details:**
    *   *For Video:* Define appeal features, desired emotion, target platform, select a theme/angle, choose a format/template (Images 8, 9, 10, 11, 12).
    *   *For Copy/LP:* Define core message, potentially link to Theme.
5.  **Manage & Organize:** Assign creatives and personas to Campaigns.
6.  **(Future) AI Generation/Assistance:** Generate copy suggestions, potentially video structures, etc.
7.  **(Long-term) Advanced Workflow:** Utilize deeper AI analysis, reporting, and potentially an editor interface (Images 3, 13-17).

## 2. Technology Stack

**(Same as before: SvelteKit, TypeScript, Drizzle ORM, SQLite, Tailwind CSS, Svelte 5 Runes, Storybook, ESLint/Prettier)**

## Current Progress (As of April 7, 2025 - Updated)

*   **Phase 0: Foundation:**
    *   Project setup with SvelteKit, TypeScript, Tailwind CSS, Drizzle ORM, SQLite.
    *   Basic layout structure established (`src/routes/+layout.svelte`).
    *   Added global header navigation (`src/lib/components/layout/Header.svelte`) with links to major sections (Home, Campaigns, Personas, Creatives).
    *   Database schema defined (`schema.ts`) and initial database state confirmed.
*   **Phase 1 & 2: Core Entities & Detailed Personas (SPA Strategy):**
    *   **Campaigns:**
        *   Full CRUD API endpoints implemented (`/api/campaigns` for GET/POST, `/api/campaigns/[id]` for GET/PUT/DELETE).
        *   Frontend pages (List, New, Detail, Edit) implemented using SPA strategy (`/campaigns`, `/campaigns/new`, `/campaigns/[id]`, `/campaigns/[id]/edit`).
    *   **Personas:**
        *   Full CRUD API endpoints implemented (`/api/personas` for GET/POST, `/api/personas/[id]` for GET/PUT/DELETE).
        *   Frontend pages (List, New, Detail, Edit) implemented using SPA strategy, including detailed fields (`/personas`, `/personas/new`, `/personas/[id]`, `/personas/[id]/edit`).
        *   Mock AI Persona Generation implemented:
            *   `/api/personas/generate` mock endpoint created.
            *   "Generate" button added to `/personas/new` form, populating fields on mock success.
    *   **Creatives (Phase 1 - Text & Image):**
        *   Full CRUD API endpoints implemented for core creative and Text/Image types (`/api/creatives` for GET/POST, `/api/creatives/[id]` for GET/PUT/DELETE).
        *   Frontend pages (List, New, Detail, Edit) implemented using SPA strategy for Text and Image types (`/creatives`, `/creatives/new`, `/creatives/[id]`, `/creatives/[id]/edit`). Form includes type selection and conditional fields.
*   **Development Strategy:**
    *   Consistently using a Single-Page Application (SPA) strategy with client-side `fetch` calls to dedicated API endpoints and Svelte 5 Runes for state management.

## 3. Phased Development Plan

*   **General Notes:**
    *   **State Management:** Use Svelte 5 Runes (`$state`, `$derived`, `$effect`) consistently.
    *   **Database:** SQLite via Drizzle ORM. Remember manual `updatedAt` handling and `PRAGMA foreign_keys = ON;`.
    *   **Terminology:** Use labels/terms inspired by the images where practical (e.g., "Appeal Feature," "Stimulating Emotion").

*   **Phase 1: Foundation, Core Creative Types (Text, Image, Basic Video/LP)**
    *   **Developer Tasks:**
        *   Setup, Layout, Shared Components (as before).
        *   **Database Schema (Initial):** `campaigns` (basic fields), `personas` (basic fields), `creatives`, `creativeText`, `creativeImage`, `creativeVideo` (URL, platform, format, duration only), `creativeLp` (URL, headline only). Use SQLite types (Schema below).
        *   Migrations (`drizzle-kit generate:sqlite`, apply).
        *   **Creative CRUD (`/creatives/...`):** Implement basic list, create, view, edit, delete for the four core types. `CreativeForm` uses conditional fields. `CreativeList/Card` shows basic info.
        *   **Basic Linking UI:** Add simple dropdowns in `CreativeForm` to select *existing* Campaign/Persona (by ID/Name). Save `campaignId`, `personaId`.
        *   **No File Uploads Yet:** Store image/video URLs provided by the user.

*   **Phase 2: Detailed Persona Management & AI Assist**
    *   **Developer Tasks:**
        *   **Database Schema:** Enhance `personas` table with *all* detailed fields from Images 5 & 6 (personaTitle, ageRange specific format, jobTitle, incomeLevel, personalityTraits, values, spendingHabits, interestsHobbies, lifestyle, needsPainPoints, goalsExpectations, backstory, purchaseProcess).
        *   Migrations.
        *   **Persona UI (`/personas/...`):**
            *   Update `PersonaForm` with all new fields, using appropriate input types (text, textarea). Match Image 2 inputs for Age (radios + text range) and Gender.
            *   Implement `PersonaDetailView` showing all fields clearly sectioned.
            *   `PersonaCard` can show name, title, image.
        *   **AI-Assisted Persona Generation (`PersonaForm`):**
            *   Add "顧客画像イメージを生成する" (Generate Persona Details) button.
            *   Inputs: Age range/selection, Gender (as per Image 2). Potentially add a field for "Industry" or "Core Need" to guide generation better.
            *   Backend API (`/api/personas/generate`): Takes inputs, (initially returns mock data matching the detailed fields, later calls real AI).
            *   Frontend: Call API on button click, populate the `$state` variables bound to the form fields with the response. User can edit before saving. Add `isGenerated` flag handling.
        *   **Linking:** Ensure Persona selection dropdown in `CreativeForm` searches/displays detailed personas.

*   **Phase 3: Campaign Management & Introduction of Themes**
    *   **Developer Tasks:**
        *   **Database Schema:**
            *   Enhance `campaigns` table (targetPlatforms, status).
            *   Add new `themes` table (id, title, description, associatedPainPoint - based on Image 9).
            *   Add optional `themeId` foreign key to `creatives` table.
        *   Migrations.
        *   **Campaign UI (`/campaigns/...`):** Implement full CRUD for Campaigns with the enhanced fields. `CampaignDetailView` should list associated creatives.
        *   **Theme Management (Simple):**
            *   Add basic CRUD UI for managing Themes (`/settings/themes` or similar).
            *   Allow creating themes with Title, Description, Pain Point.
        *   **Linking Creatives & Themes:**
            *   In `CreativeForm`, add a dropdown/searchable select to associate an *existing* Theme.
            *   Save `themeId` in the `creatives` table.
            *   Display linked Theme info on `CreativeDetailView`.

*   **Phase 4: Enhanced Video Workflow & Templates**
    *   **Developer Tasks:**
        *   **Database Schema:**
            *   Enhance `creativeVideo` table with `appealFeature` (text), `emotion` (text enum based on Image 8), `templateId` (integer FK).
            *   Add new `videoTemplates` table (id, templateCode [e.g., "02766"], name, durationSeconds, materialCount, aspectRatio, sceneCount, recommendedPlatforms [JSON/text], resolution, previewUrl - based on Image 12).
        *   Migrations.
        *   **Video Template Management (Simple):** Add basic CRUD UI for managing Video Templates (`/settings/video-templates` or similar). Allow uploading a preview image/entering URL.
        *   **Video Creative UI (`CreativeFormFieldsVideo`):**
            *   Add UI elements (radio groups/cards inspired by Image 8) for selecting `Appeal Feature` (maybe allow multiple selections stored as JSON/CSV text?) and `Stimulating Emotion`. Use icons if possible.
            *   Add UI (dropdown/cards with previews inspired by Image 11) to select a `VideoTemplate`. Potentially filter/recommend templates based on selected Platform or Theme (basic filtering for now).
            *   Update `CreativeDetailView` for videos to show these new fields and linked template info.
        *   **AI Copy Suggestions (`CreativeFormFieldsText`, others):**
            *   Implement "Generate Suggestions" button + API call (`/api/copy/generate`).
            *   Pass relevant context: creative type, linked Persona details (`needsPainPoints`, `goalsExpectations`), linked Campaign (`goal`), linked Theme (`title`, `description`, `associatedPainPoint`).
            *   Display suggestions, allow user to use/edit. Manage state with `$state`.

*   **Phase 5 & Beyond (Aspirational / Long-Term R&D - Requires significant effort):**
    *   **Goals:** Implement features inspired by Images 3, 13-17.
    *   **Potential Features:**
        *   **Product/Service Management:** Add entity to associate with campaigns.
        *   **Advanced Strategy Module (Image 3):** UI to define Positioning (3C, PoD/PoP), WHO (Insights beyond Persona), WHAT (Benefits), HOW (Appeal Axis, Expression Axis, Media Plan). Link these strategy elements.
        *   **Structured Databases (Image 17):** Build management UI and schemas for `StructureDB` (copy frameworks, video scene structures) and `DesignDB` (visual styles).
        *   **AI Generation (Advanced):** Generate video scene lists, LP wireframes based on selected templates, themes, personas, and assets. Integrate with Structure/Design DBs.
        *   **Data Ingestion & Analysis (Image 15, 16):** Tools to input URLs, competitor info, meeting notes. AI analysis to generate Competitor Reports, Target Audience Analysis.
        *   **Workflow Orchestration (Image 14):** Guided workflow through Plan -> Design -> Check -> Action, with AI suggestions at each stage.
        *   **Video Editor Interface (Image 13):** A web-based editor to assemble scenes, add assets (requires robust file upload/management), apply text/audio.
        *   **File Upload & Management:** Integrate cloud storage (S3, etc.) for images, videos, logos. Build asset library UI.
        *   **Performance Tracking:** Integrate with Ad Platform APIs.

## 4. Enhanced Database Schema (`src/lib/server/db/schema.ts` - SQLite Version - Detailed)

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
  imageUrl: text('url').notNull(),
  altText: text('alt_text'),
  width: integer('width'),
  height: integer('height'),
});

export const creativeVideo = sqliteTable('creative_video', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  creativeId: integer('creative_id').notNull().unique().references(() => creatives.id, { onDelete: 'cascade' }),
  videoUrl: text('url'),
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
  pageUrl: text('url').notNull(),
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

```

## 5. Frontend Components (`src/lib/components/`)

*   **`/shared/`**: Add `CardSelector.svelte` (for visual choices like Image 8/11), `Icon.svelte`.
*   **`/creatives/`**:
    *   `CreativeForm.svelte`: Orchestrates selection of Type, Campaign, Persona, Theme. Uses `$state` heavily for managing form data.
    *   `CreativeFormFieldsVideo.svelte`: Needs significant updates for Phase 4:
        *   Use `CardSelector` or similar for "Appeal Feature" (Image 8).
        *   Use `CardSelector` with icons for "Stimulating Emotion" (Image 8).
        *   Dropdown for Platform (Image 10).
        *   `CardSelector` with previews for `VideoTemplate` selection (Image 11), potentially filtering based on platform/theme `$state`.
    *   `CreativeDetailView.svelte`: Display all linked info (Campaign, Persona, Theme, Template).
    *   `AICopySuggester.svelte`: Component for Phase 4 AI copy feature.
*   **`/personas/`**:
    *   `PersonaForm.svelte`: Add all new fields. Use radio buttons/text input for Age as in Image 2. Include the "Generate Persona Details" button and associated logic using `$state`.
    *   `PersonaDetailView.svelte`: Structure to display the rich profile clearly (like Images 5/6).
*   **`/campaigns/`**: Update forms/views for new fields.
*   **`/settings/`**: (New section for Phase 3/4)
    *   `/settings/themes`: CRUD UI for managing Themes.
    *   `/settings/video-templates`: CRUD UI for managing Video Templates.

## 6. Sitemap / Routes (`src/routes/`)

*   **(Mostly the same)**
*   Add `/settings/themes` and `/settings/video-templates` routes.

## 7. API Endpoints & Data Flow

*   **Data Fetching (Lists/Details):** Primarily use client-side `fetch` calls from page components (`+page.svelte`) to dedicated API GET endpoints (`/api/.../+server.ts`). Handle loading/error states within the component using `$state`.
*   **Data Mutations (Create/Update/Delete):** Use client-side `fetch` calls (POST, PUT, DELETE) from components (e.g., within form `onsubmit` handlers) to dedicated API endpoints. API endpoints handle database interaction and return success/error status. Client-side logic handles UI updates, error display, and navigation (e.g., using `goto`).
*   **AI Endpoints:** Dedicated API routes (`/api/.../generate`) will handle communication with external AI services.
*   **Manual `updatedAt`:** Remember to manually set the `updatedAt` timestamp in the application logic (API route handlers) before performing database updates.

## 8. Key Considerations for Developers

*   **(Keep existing points)**
*   **UI Complexity:** The forms (especially for Video Creatives) become more complex with conditional logic and visual selectors. Use Svelte 5's `$derived` and component composition effectively.
*   **Data Relationships:** Pay close attention to fetching and displaying related data (Campaigns, Personas, Themes, Templates) using Drizzle relations in `load` functions.
*   **User Experience:** Guide the user through the more complex creation process (e.g., steps for video creation). Provide good defaults and clear feedback.
*   **Scalability (Long Term):** While starting with SQLite, keep in mind that the advanced features (Image 13-17) involving large datasets (Structure/Design DBs), heavy AI processing, and potentially real-time editing would likely necessitate a move to a more robust database (like PostgreSQL) and architecture later.

## 9. Getting Started

**(Keep existing setup instructions, update schema path/driver config for SQLite in `drizzle.config.ts`. Ensure migrations are run after schema changes.)**

Okay, here is the final, consolidated, and detailed development plan for the "Marketing Manager" application, incorporating the features derived from the images, using SQLite and Svelte 5 Runes, and presented in a MoSCoW prioritized table format.

---

**Final Development Plan: Marketing Manager**

**Version:** 1.0
**Date:** October 26, 2023
**Project Goal:** To develop a web application for marketing professionals to manage marketing assets (personas, creatives), plan campaigns, and leverage AI assistance for ideation and generation, inspired by the provided visual examples.
**Core Technology Stack:**
*   **Framework:** SvelteKit 5 (Using Runes)
*   **Language:** TypeScript
*   **Database ORM:** Drizzle ORM
*   **Database:** SQLite (via `better-sqlite3` or similar)
*   **Styling:** Tailwind CSS
*   **State Management:** Svelte 5 Native State (Runes: `$state`, `$derived`, `$effect`)
*   **Component Dev/Test:** Storybook

**MoSCoW Prioritization Key:**
*   **M (Must Have):** Essential for MVP launch. Core functionality cannot be omitted.
*   **S (Should Have):** Important, high-value features closely aligned with vision/images. Launch possible without, but highly desirable soon after.
*   **C (Could Have):** Desirable additions, enhancements, or more complex features for later iterations.
*   **W (Won't Have):** Features explicitly out of scope for initial development cycles due to complexity or strategic decision.

---

**Detailed Feature Development Plan & MoSCoW Analysis**

| Phase | Feature Area          | Specific Feature                                  | MoSCoW | Key UI Elements / Workflow                                                                                                | Data Model Impact                                                                                                                                 | Notes / Considerations                                                                                                |
| :---- | :-------------------- | :------------------------------------------------ | :----- | :------------------------------------------------------------------------------------------------------------------------ | :------------------------------------------------------------------------------------------------------------------------------------------------ | :-------------------------------------------------------------------------------------------------------------------- |
| **0** | **Setup & Foundation** | Project Initialization                            | **M**  | Standard SvelteKit setup (`npm create svelte@latest`).                                                                      | -                                                                                                                                                 | Install SvelteKit, TS, Tailwind, Drizzle, SQLite driver, ESLint, Prettier.                                           |
| 0     |                       | Basic Layout & Navigation                         | **M**  | Main `+layout.svelte` with header/sidebar (links initially placeholders). Basic routing defined in `/src/routes`.         | -                                                                                                                                                 | Establishes consistent app structure and navigation patterns.                                                          |
| 0     |                       | Shared UI Components (Basic)                      | **M**  | `/shared`: `Button`, `Input`, `Textarea`, `Select`, `Card`, `Modal`, `LoadingSpinner`, `PageHeader`. Develop via Storybook. | -                                                                                                                                                 | Reusable, styled primitives essential for consistent UI.                                                              |
| 0     |                       | Drizzle ORM & SQLite Setup                       | **M**  | `drizzle.config.ts` for SQLite. `.env` for `DATABASE_URL="sqlite:./path/to/db.sqlite"`. Migration workflow established. | Initial `schema.ts` file.                                                                                                                         | Ensure SQLite driver installed. Confirm `PRAGMA foreign_keys = ON;` is active. Plan for manual `updatedAt` handling.      |
| **1** | **Core Entities & CRUD** | **Campaigns (Basic CRUD)**                      | **M**  | `/campaigns` list (`Card`), `/campaigns/new`, `/[id]/edit` form (Name, Goal), `/[id]` detail view. Use Svelte 5 `$state` for forms. | `campaigns` table (id, name, goal, createdAt, updatedAt).                                                                                         | Foundational organizational unit. **(Completed)**                                                                       |
| 1     |                       | **Personas (Basic CRUD)**                         | **M**  | `/personas` list (`Card`), `/personas/new`, `/[id]/edit` form (*only Name* field initially), `/[id]` detail view.            | `personas` table (id, name, createdAt, updatedAt - detailed fields added Phase 2).                                                              | Establishes the Persona entity. **(Completed - List/Create via SPA)** Details are critical but added next.             |
| 1     |                       | **Creatives (Core Concept & CRUD)**               | **M**  | `/creatives` list (`Card`), `/creatives/new` (Select Type -> Show Fields), `/[id]/edit`, `/[id]` detail view.                | `creatives` table (id, name, type[enum], description, campaignId[FK], personaId[FK], themeId[FK, nullable], createdAt, updatedAt). Basic relations. | Central hub for assets. FKs included for structure; linking UI is basic.                                             |
| 1     |                       | **Creative Types (Text, Image - Basic)**          | **M**  | `CreativeForm`: Conditional display (`{#if type === 'text'}`) for Text (Headline, Body, CTA), Image (URL, Alt Text). View shows data. | `creativeText`, `creativeImage` tables (basic fields). 1-to-1 relations to `creatives`.                                                           | MVP requires storing basic text/image info. **No file uploads - user pastes URLs.**                                  |
| 1     |                       | **Creative Types (Video, LP - Basic)**            | **M**  | `CreativeForm`: Conditional display for Video (URL, Platform[text], Format[text], Duration[int]), LP (URL, Headline). View. | `creativeVideo`, `creativeLp` tables (basic fields). 1-to-1 relations to `creatives`.                                                             | Captures essential metadata provided by the user for Video/LP.                                                       |
| 1     |                       | **Basic Linking UI (Creatives <-> Campaign/Persona)** | **M**  | `CreativeForm`: Simple `<select>` dropdowns populated with existing Campaign/Persona names/IDs. Saves IDs to FK fields.   | Uses `campaignId`, `personaId` FKs in `creatives`.                                                                                               | Essential for organizing creatives within the MVP structure.                                                          |
| **2** | **Detailed Personas** | **Detailed Persona Fields (Data Model)**            | **M**  | - (Schema definition)                                                                                                     | Enhance `personas` table with *all* fields derived from Image 5/6 (personaTitle, ageRangeSelection, ageRangeCustom, gender, location, jobTitle, incomeLevel, personalityTraits, valuesText, spendingHabits, interestsHobbies, lifestyle, needsPainPoints, goalsExpectations, backstory, purchaseProcess). Use SQLite types. | Critical data capture to match reference examples.                                                                    |
| 2     |                       | **Detailed Persona UI (Form & View)**             | **M**  | `/personas/new`, `/[id]/edit`: Multi-section form matching data fields. `/personas/[id]`: Structured detail view. Use `$state`. | - (UI implementation using Phase 2 schema)                                                                                                        | Provides the interface to manage the rich persona data.                                                               |
| 2     |                       | **Image 2 UI Replication (Age/Gender Input)**     | **S**  | `PersonaForm`: Implement Age range radios (`10s`, `20s`...) + 'Other' text input. Gender radios (`Male`, `Female`...).        | Uses `ageRangeSelection`, `ageRangeCustom`, `gender` fields in `personas`.                                                                          | High fidelity to reference UI, improves user experience. Could simplify to text input if time-constrained (`C`).     |
| 2     |                       | **AI Persona Generation (Trigger & Mock UI)**     | **M**  | `PersonaForm`: "顧客画像イメージを生成する" button. On click: trigger API call, display loading state, populate form fields (`$state`) on mock response. | Add `isGenerated` (boolean/integer) field to `personas`.                                                                                         | Implements the visible AI workflow. Mock response essential for UI dev without immediate AI dependency.                 |
| 2     |                       | **AI Persona Generation (Backend API - Mock)**    | **M**  | `/api/personas/generate`: Endpoint accepts basic inputs (e.g., age, gender), returns *hardcoded JSON* matching detailed fields. | -                                                                                                                                                 | Decouples frontend dev from actual AI service.                                                                      |
| 2     |                       | **AI Persona Generation (Real AI Integration)**   | **S**  | `/api/personas/generate`: Replace mock logic with call to LLM API (e.g., OpenAI). Construct prompt using inputs. Handle API key securely. | -                                                                                                                                                 | Delivers the core AI value proposition for personas. Requires setup, cost, prompt tuning.                            |
| **3** | **Campaigns & Themes**| **Enhanced Campaign Fields**                      | **S**  | `CampaignForm`/`View`: Add inputs/display for Status (select), Target Platforms (text/tags).                               | Add `status` (enum/text), `targetPlatforms` (text) fields to `campaigns`.                                                                           | Adds practical detail for campaign management.                                                                      |
| 3     |                       | **Themes (Concept & CRUD)**                       | **M**  | `/settings/themes`: Basic list, create, edit, delete UI for Themes (Title, Description, Pain Point - based on Image 9).   | `themes` table (id, title, description, associatedPainPoint, createdAt).                                                                          | Essential strategic input concept shown feeding into creative process (Image 9 -> Image 8). Required for Phase 4 video. |
| 3     |                       | **Link Creatives to Themes**                      | **M**  | `CreativeForm`: Add `<select>` dropdown to associate an existing Theme with a Creative. Display linked Theme on detail view. | Uses `themeId` FK in `creatives`. Define `relations`.                                                                                             | Connects the strategic angle (Theme) directly to the creative asset.                                                  |
| **4** | **Adv. Video & AI Copy**| **Video Templates (Concept & CRUD)**            | **S**  | `/settings/video-templates`: Basic CRUD UI. Manage fields from Image 12 (Code, Name, Duration, Aspect Ratio, Preview URL etc.). | `videoTemplates` table (id, templateCode[unique], name, durationSeconds, materialCount, aspectRatio, sceneCount, recommendedPlatforms[json], resolution, previewUrl, createdAt). | Foundational for the template-driven video workflow (Image 11/12). Significant UX improvement.                       |
| 4     |                       | **Video Creative UI: Appeal/Emotion (Image 8)**   | **S**  | `CreativeFormFieldsVideo`: Use `CardSelector`/radios for Appeal Feature ("アピールしたい商材特徴"). Use `CardSelector` w/ icons for Emotion ("刺激したい感情"). | Add `appealFeature` (text), `emotion` (enum/text) fields to `creativeVideo`.                                                                    | Directly implements key UI/workflow step from Image 8. Guides creative direction.                                  |
| 4     |                       | **Video Creative UI: Platform/Template (Image 10/11)** | **S**  | `CreativeFormFieldsVideo`: Dropdown for Platform (`配信先`). `CardSelector` w/ previews for Template selection (`動画フォーマットの選択`). Filter templates? | Add `templateId` FK to `creativeVideo`. Define `relations`. `platform` field in `creativeVideo` used.                                         | Implements platform/format selection shown in Images 10/11. Depends on Video Templates feature. Filter adds value (`C`). |
| 4     |                       | **AI Copy Suggestion (Trigger & Mock/Real)**      | **S**  | `CreativeFormFieldsText` (etc.): "Generate Suggestions" button. Calls `/api/copy/generate`. Mock first, then real AI using context (Persona, Theme). | -                                                                                                                                                 | Extends AI assistance to copy. High value-add feature.                                                               |
| 4     |                       | **Creative Filtering (Basic)**                    | **S**  | `/creatives`: UI controls (dropdowns) to filter list by Type, Campaign, Persona, Theme. Update `load` function logic.       | - (Uses existing fields for filtering)                                                                                                             | Essential usability improvement as data volume increases.                                                            |
| **5+**| **Future / Advanced** | Strategy Module (Image 3)                         | **C**  | Dedicated UI section for 3C, PoD/PoP, WHO Insights, WHAT Benefits, HOW Axis. Link to Campaigns/Creatives.               | Requires new tables (`strategyPoints`, `insights`, `benefits` etc.) and complex relations.                                                         | Adds significant strategic depth but is a major feature expansion.                                                   |
| 5+**|                       | Structured DBs (Image 17)                         | **C**  | UI/Schema (`structureTemplates`, `designStyles`) to manage reusable frameworks (copy, video scenes, design elements).       | New tables and management interfaces.                                                                                                             | Foundational for advanced AI generation ("mass production"). Requires significant design and implementation.         |
| 5+**|                       | Advanced AI Generation (Video Scenes, LP Wireframes)| **C**  | AI uses inputs + Structured DBs to generate draft video scene lists or LP structure proposals.                              | Complex AI prompting/fine-tuning. Output might be JSON/text descriptions.                                                                         | Core of the "mass production" vision. High complexity and dependency.                                                |
| 5+**|                       | Data Ingestion/Analysis (Image 15, 16)**            | **C**  | Features to input URLs, competitor notes. AI backend analyzes and generates Competitor/Target reports.                       | New tables (`ingestedData`, `analysisReports`). Complex backend processing.                                                                     | Powerful automation but requires significant backend/AI work.                                                       |
| 5+**|                       | Workflow Orchestration (Image 14)**               | **C**  | Guided UI flow (Plan->Design->Check->Action) coordinating different modules/features, possibly with AI suggestions.           | Complex state management across application, potentially tracking workflow progress per campaign/creative.                                    | High-level feature integrating many parts. Needs mature base features first.                                        |
| 5+**|                       | Direct File Uploads (Image/Video/Assets)**        | **C**  | Implement file uploads to cloud storage (S3/GCS/etc.). Update forms. Potentially add an Asset Library UI.                 | Store cloud storage URLs. May need `assets` table. Requires backend API endpoint for uploads, storage setup, cost consideration.             | Major UX improvement over pasting URLs. Deferred due to complexity but could be prioritized higher later (`S`).     |
| 5+**|                       | Full Video Editor (Image 13)**                    | **W**  | In-browser timeline-based video editing interface.                                                                        | -                                                                                                                                                 | Extremely complex, requires specialized libraries or significant custom development. Out of scope for this project iteration. |

---

**Key Technical Considerations:**

1.  **SQLite:**
    *   **Simplicity:** Easy local setup, single-file database.
    *   **`updatedAt` Timestamps:** Must be manually set in application code (server actions/API routes) before performing `update` operations.
    *   **Concurrency:** Limited write concurrency compared to server-based DBs. Monitor performance if usage grows significantly.
    *   **Migrations:** Use `drizzle-kit generate:sqlite` and apply via `db push` (dev) or generated SQL files (prod). Ensure `PRAGMA foreign_keys = ON;`.
    *   **Deployment:** Requires persistent file storage for the database file. Consider solutions like Litestream for backups/replication if deploying beyond simple VM/container.
2.  **Svelte 5 Runes:**
    *   Use `$state` for reactive variables.
    *   Use `$derived` for computed values based on state.
    *   Use `$effect` for side effects reacting to state changes (API calls triggered by state, logging, etc.).
    *   Manage shared state by exporting/importing `$state` variables from `.ts` modules. Avoid legacy Svelte Stores.
3.  **Drizzle ORM:** Leverage its type safety and query building capabilities. Use `relations` extensively for fetching related data efficiently in `load` functions.
4.  **Error Handling & Validation:** Implement robust error handling (client/server) and use libraries like `zod` for data validation in server actions/API routes.
5.  **AI Integration:** Design modular API interfaces for AI calls. Start with mocks. Manage API keys securely via environment variables. Be mindful of costs and rate limits.

---

**High-Level Roadmap Summary:**

1.  **Foundation (Phase 0):** Set up the project, core tools, and database connection.
2.  **MVP Core (Phase 1 - Must):** Build basic CRUD for Campaigns, Personas, and all Creative types (Text, Image, Video, LP) with simple linking.
3.  **Persona Enhancement (Phase 2 - Must/Should):** Implement detailed persona profiles and introduce the first key AI feature (Persona Generation).
4.  **Strategic Layer (Phase 3 - Must):** Add the "Theme" concept as a strategic input and link it to creatives.
5.  **Video & Copy AI (Phase 4 - Should):** Enhance the video creation process significantly with templates, appeal/emotion inputs, and add AI assistance for copywriting. Implement basic filtering.
6.  **Future Iterations (Phase 5+ - Could):** Selectively implement advanced features like strategic planning modules, structured content databases, more sophisticated AI generation, data analysis, and eventually direct file uploads based on evolving priorities. The full video editor remains out of scope.

---

**Next Steps / Getting Started:**

1.  Clone repository / Initialize SvelteKit project.
2.  Install all dependencies (SvelteKit, TS, Drizzle, SQLite Driver, Tailwind, Storybook, ESLint, Prettier).
3.  Configure ESLint & Prettier.
4.  Configure Tailwind CSS (`tailwind.config.js`, `app.css`).
5.  Set up `.env` file with `DATABASE_URL="sqlite:./local.db"`.
6.  Configure `drizzle.config.ts` for SQLite.
7.  Implement initial `schema.ts` (empty or with basic Phase 1 tables).
8.  Run `npx drizzle-kit generate:sqlite` and `npx drizzle-kit db push` (or apply SQL) to initialize the database.
9.  Implement the basic layout (`+layout.svelte`) and start building shared UI components in Storybook (Phase 0).
10. Begin implementing Phase 1 features (Campaign CRUD).

---
