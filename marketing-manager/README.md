# Marketing Manager

## 1. Project Overview

Marketing Manager is a web application designed to help users organize, plan, and manage marketing activities. Inspired by comprehensive marketing platforms, it aims to provide tools for managing target personas, creative assets (copy, images, videos, landing pages), campaigns, and potentially leveraging AI for generation tasks in the future.

This project is built using SvelteKit, TypeScript, Drizzle ORM for database interaction, and Tailwind CSS (assumption, can be changed) for styling. Storybook is included for component development and testing.

## 2. Core Features (Phased Approach)

### Phase 1: Creative Asset Management (Initial Focus)
*   **Goal:** Allow users to upload, categorize, and manage various marketing creative assets.
*   **Sub-features:**
    *   Upload and store text-based creatives (e.g., ad copy, slogans).
    *   Upload and store image creatives (linking to stored files or URLs).
    *   Store metadata for video creatives (URL, platform, format, duration, theme).
    *   Store metadata for landing pages (URL, description).
    *   View all creatives in a central library (list/grid view).
    *   Filter and search creatives.
    *   View detailed information for each creative.
    *   Edit creative details.
    *   Delete creatives.

### Phase 2: Persona Management
*   **Goal:** Define and manage detailed target audience personas.
*   **Sub-features:**
    *   Create personas with demographic, psychographic, needs, goals, and backstory information.
    *   View a list of all personas.
    *   View detailed persona profiles.
    *   Edit persona details.
    *   Delete personas.
    *   (Optional Future) AI-assisted persona generation based on inputs.

### Phase 3: Campaign Management
*   **Goal:** Organize creatives and personas into specific marketing campaigns.
*   **Sub-features:**
    *   Create campaigns with names, goals, start/end dates.
    *   Associate personas with campaigns.
    *   Associate creatives with campaigns.
    *   View campaign dashboards summarizing associated assets.

### Phase 4: Advanced Features & AI Integration (Future)
*   **Goal:** Enhance workflow with automation and generation capabilities.
*   **Sub-features:**
    *   Video ad workflow simulation (selecting themes, emotions, formats as per reference images).
    *   AI-powered copy generation suggestions.
    *   Integration with ad platforms (reporting or basic management).
    *   Analytics dashboard.

### Phase 5: AI-Driven Workflow Automation (Aspirational / Long-Term)
*   **Goal:** Leverage AI to automate and enhance various stages of the marketing workflow, based on advanced concepts.
*   **Sub-features (Examples):**
    *   **AI-Assisted Data Analysis:** Ingest and analyze competitor data, customer information (manual input or future integration), meeting transcripts, etc., to generate insights.
    *   **Automated Report Generation:** Create reports for competitor analysis, target audience analysis based on ingested data.
    *   **Automated Content Generation:** Generate target lists, copy proposals, design plans, and potentially key visual concepts based on AI analysis and internal knowledge bases.
    *   **Workflow Orchestration:** Tools to guide users through the multi-stage marketing process (Plan, Design, Check, Action) with AI assistance at each step.
    *   **Knowledge Base Integration:** Connect AI models to internal databases containing structured information (e.g., design patterns, copy structures) to inform generation.
    *   **URL-Based Information Gathering:** (Advanced) Initiate analysis or content generation starting from a URL (e.g., competitor website, product page).

*   **Note:** Implementing this phase represents a significant R&D effort, likely requiring specialized AI/ML expertise, data engineering, and potentially integration with third-party AI platforms or custom model development.

## 3. Technology Stack

*   **Framework:** SvelteKit
*   **Language:** TypeScript
*   **Database ORM:** Drizzle ORM
*   **Database:** PostgreSQL (Recommended, configure in `.env`)
*   **Styling:** Tailwind CSS (To be installed) / Plain CSS
*   **Component Library:** Storybook (already configured)
*   **Linting/Formatting:** ESLint, Prettier (Recommended setup)

## 4. Database Schema (`src/lib/server/db/schema.ts`)

```typescript
import { pgTable, serial, text, varchar, timestamp, integer, uniqueIndex, foreignKey, boolean, jsonb } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// --- Core Tables ---

export const campaigns = pgTable('campaigns', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  goal: text('goal'),
  startDate: timestamp('start_date'),
  endDate: timestamp('end_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const personas = pgTable('personas', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  personaTitle: text('persona_title'), // e.g., "Budget-conscious innovator..."
  // Demographics
  age: integer('age'),
  gender: varchar('gender', { length: 50 }),
  location: varchar('location', { length: 255 }),
  jobTitle: varchar('job_title', { length: 255 }),
  incomeLevel: varchar('income_level', { length: 100 }),
  // Psychographics
  personalityTraits: text('personality_traits'), // e.g., "Creative, flexible"
  values: text('values'), // e.g., "Efficiency, innovation"
  spendingHabits: text('spending_habits'), // e.g., "Invests in new gadgets"
  interestsHobbies: text('interests_hobbies'), // e.g., "Movie enthusiast, gadget collector"
  lifestyle: text('lifestyle'), // e.g., "Spends weekends with family"
  // Needs & Goals
  needsPainPoints: text('needs_pain_points'), // e.g., "High ad creation cost..."
  goalsExpectations: text('goals_expectations'), // e.g., "Reduce production time/cost..."
  // Story
  backstory: text('backstory'),
  purchaseProcess: text('purchase_process'), // e.g., "Recommendations, online reviews..."
  // Meta
  imageUrl: varchar('image_url', { length: 1024 }), // URL to a representative image
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const creatives = pgTable('creatives', {
  id: serial('id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull(), // 'text', 'image', 'video', 'lp'
  description: text('description'),
  campaignId: integer('campaign_id').references(() => campaigns.id, { onDelete: 'set null' }), // Optional link
  personaId: integer('persona_id').references(() => personas.id, { onDelete: 'set null' }),   // Optional link
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// --- Creative Type Specific Tables ---

export const creativeText = pgTable('creative_text', {
  id: serial('id').primaryKey(),
  creativeId: integer('creative_id').notNull().references(() => creatives.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
});

export const creativeImage = pgTable('creative_image', {
  id: serial('id').primaryKey(),
  creativeId: integer('creative_id').notNull().references(() => creatives.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 1024 }).notNull(), // URL to the image file
  altText: varchar('alt_text', { length: 255 }),
  width: integer('width'),
  height: integer('height'),
});

export const creativeVideo = pgTable('creative_video', {
  id: serial('id').primaryKey(),
  creativeId: integer('creative_id').notNull().references(() => creatives.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 1024 }), // URL to the video file or platform (e.g., YouTube)
  platform: varchar('platform', { length: 100 }), // e.g., 'YouTube', 'Facebook', 'TikTok', 'Instagram'
  format: varchar('format', { length: 100 }), // e.g., '16:9', '1:1', '9:16'
  duration: integer('duration'), // in seconds
  theme: text('theme'), // As seen in reference images
  emotion: varchar('emotion', { length: 100 }), // As seen in reference images
  // Add other relevant fields based on reference images if needed
});

export const creativeLp = pgTable('creative_lp', { // LP = Landing Page
  id: serial('id').primaryKey(),
  creativeId: integer('creative_id').notNull().references(() => creatives.id, { onDelete: 'cascade' }),
  url: varchar('url', { length: 1024 }).notNull(),
  headline: text('headline'),
  // Potentially add fields for key sections or components if needed later
});

// --- Relations ---

export const campaignRelations = relations(campaigns, ({ many }) => ({
  creatives: many(creatives),
}));

export const personaRelations = relations(personas, ({ many }) => ({
  creatives: many(creatives),
}));

export const creativeRelations = relations(creatives, ({ one, many }) => ({
  campaign: one(campaigns, {
    fields: [creatives.campaignId],
    references: [campaigns.id],
  }),
  persona: one(personas, {
    fields: [creatives.personaId],
    references: [personas.id],
  }),
  textData: one(creativeText, { // Use a different name if 'text' conflicts
    fields: [creatives.id],
    references: [creativeText.creativeId],
  }),
  imageData: one(creativeImage, {
    fields: [creatives.id],
    references: [creativeImage.creativeId],
  }),
  videoData: one(creativeVideo, {
    fields: [creatives.id],
    references: [creativeVideo.creativeId],
  }),
  lpData: one(creativeLp, {
    fields: [creatives.id],
    references: [creativeLp.creativeId],
  }),
}));

// Add relations for specific creative types back to the main creative table
export const creativeTextRelations = relations(creativeText, ({ one }) => ({
    creative: one(creatives, {
        fields: [creativeText.creativeId],
        references: [creatives.id],
    }),
}));
// ... similar relations for creativeImage, creativeVideo, creativeLp ...
export const creativeImageRelations = relations(creativeImage, ({ one }) => ({
    creative: one(creatives, {
        fields: [creativeImage.creativeId],
        references: [creatives.id],
    }),
}));
export const creativeVideoRelations = relations(creativeVideo, ({ one }) => ({
    creative: one(creatives, {
        fields: [creativeVideo.creativeId],
        references: [creatives.id],
    }),
}));
export const creativeLpRelations = relations(creativeLp, ({ one }) => ({
    creative: one(creatives, {
        fields: [creativeLp.creativeId],
        references: [creatives.id],
    }),
}));

```

## 5. Frontend Components (`src/lib/components/`)

*   **`/shared/`**
    *   `Button.svelte` (Consider enhancing the Storybook one)
    *   `Input.svelte`
    *   `Textarea.svelte`
    *   `Select.svelte`
    *   `Modal.svelte`
    *   `Card.svelte`
    *   `LoadingSpinner.svelte`
    *   `PageHeader.svelte`
*   **`/creatives/`**
    *   `CreativeCard.svelte`: Displays summary of any creative type.
    *   `CreativeList.svelte`: Grid/list layout for `CreativeCard`s.
    *   `CreativeFilter.svelte`: UI for filtering creatives.
    *   `CreativeForm.svelte`: Wrapper form handling common fields and submission.
    *   `CreativeFormFieldsText.svelte`: Specific fields for text creatives.
    *   `CreativeFormFieldsImage.svelte`: Specific fields for image creatives.
    *   `CreativeFormFieldsVideo.svelte`: Specific fields for video creatives.
    *   `CreativeFormFieldsLP.svelte`: Specific fields for landing page creatives.
    *   `CreativeDetailView.svelte`: Displays full details of a selected creative.
*   **`/personas/`** (Phase 2)
    *   `PersonaCard.svelte`
    *   `PersonaList.svelte`
    *   `PersonaForm.svelte`
    *   `PersonaDetailView.svelte`
*   **`/campaigns/`** (Phase 3)
    *   `CampaignCard.svelte`
    *   `CampaignList.svelte`
    *   `CampaignForm.svelte`
    *   `CampaignDetailView.svelte`

## 6. Sitemap / Routes (`src/routes/`)

*   `/` : Dashboard (Initially maybe redirect to `/creatives` or show overview)
*   **/creatives/**
    *   `/`: List all creatives (`CreativeList`)
    *   `/new`: Form to add a new creative (`CreativeForm` with dynamic fields)
    *   `/[id]`: View creative details (`CreativeDetailView`)
    *   `/[id]/edit`: Form to edit a creative (`CreativeForm` pre-filled)
*   **/personas/** (Phase 2)
    *   `/`: List all personas
    *   `/new`: Form to add a new persona
    *   `/[id]`: View persona details
    *   `/[id]/edit`: Form to edit a persona
*   **/campaigns/** (Phase 3)
    *   `/`: List all campaigns
    *   `/new`: Form to add a new campaign
    *   `/[id]`: View campaign details
    *   `/[id]/edit`: Form to edit a campaign
*   **/settings/** (Future)
    *   `/`: Application settings

## 7. API Endpoints (SvelteKit Actions/Server Routes)

SvelteKit's form actions and server routes will handle data operations.

*   **Creatives:**
    *   `POST /creatives/new` (Action): Create a new creative (handles different types).
    *   `GET /creatives` (Load function): Fetch list of creatives (with filtering/pagination).
    *   `GET /creatives/[id]` (Load function): Fetch single creative details.
    *   `POST /creatives/[id]/edit` (Action): Update a creative.
    *   `POST /creatives/[id]/delete` (Action): Delete a creative.
*   **Personas:** (Phase 2 - similar CRUD endpoints)
*   **Campaigns:** (Phase 3 - similar CRUD endpoints)
*   **(Future) File Uploads:** A dedicated server route like `POST /api/upload` might be needed to handle image/video file uploads, potentially integrating with a cloud storage service (e.g., S3, Cloudinary).

## 8. Implementation Roadmap

1.  **Setup & Foundation:**
    *   Install Tailwind CSS.
    *   Configure ESLint/Prettier.
    *   Set up database connection (`.env`, `drizzle.config.ts`).
    *   Implement base layout (`+layout.svelte`).
2.  **Phase 1: Creative Asset Management:**
    *   Implement Drizzle schema for creatives.
    *   Run `drizzle-kit generate:pg` and `drizzle-kit push:pg`.
    *   Build shared UI components (`Button`, `Input`, `Card`, etc.).
    *   Build creative-specific components (`CreativeCard`, `CreativeList`, Forms).
    *   Implement `/creatives` routes and associated load functions/form actions for CRUD.
3.  **Phase 2: Persona Management:**
    *   Implement Drizzle schema for personas.
    *   Generate/push migrations.
    *   Build persona UI components.
    *   Implement `/personas` routes and CRUD logic.
    *   Link personas to creatives (UI and backend).
4.  **Phase 3: Campaign Management:**
    *   Implement Drizzle schema for campaigns.
    *   Generate/push migrations.
    *   Build campaign UI components.
    *   Implement `/campaigns` routes and CRUD logic.
    *   Link campaigns to creatives/personas.
5.  **Phase 4 & Beyond:**
    *   Refinement, testing, styling improvements.
    *   Implement advanced features (video workflow simulation, basic AI integration like copy suggestions).
6.  **Phase 5 & Beyond (Aspirational):**
    *   Research and development into AI-driven workflow features.
    *   Integration with AI models/platforms.
    *   Development of data ingestion and analysis pipelines.
    *   Building complex workflow automation UI/backend.

## 9. Getting Started

### Prerequisites
*   Node.js (v18 or later recommended)
*   npm, pnpm, or yarn
*   Access to a PostgreSQL database

### Installation & Setup
1.  Clone the repository:
    ```bash
    git clone <repository-url>
    cd marketing-manager
    ```
2.  Install dependencies:
    ```bash
    npm install
    # or pnpm install / yarn
    ```
3.  Install Tailwind CSS (if not already done):
    ```bash
    npm install -D tailwindcss postcss autoprefixer
    npx tailwindcss init -p
    ```
    *   Configure `tailwind.config.js` (content paths).
    *   Create `src/app.css` and import Tailwind directives.
    *   Import `src/app.css` in `src/routes/+layout.svelte`.
4.  Set up environment variables:
    *   Copy `.env.example` to `.env`.
    *   Fill in your `DATABASE_URL` (e.g., `postgresql://user:password@host:port/database`).
5.  Apply database migrations:
    *   Generate migration files (if schema changes):
        ```bash
        npx drizzle-kit generate:pg
        ```
    *   Apply migrations to the database:
        ```bash
        npx drizzle-kit push:pg
        ```
        *(Note: `push:pg` is suitable for development; consider proper migration files for production)*

### Development Server
```bash
npm run dev

# or start and open in browser
npm run dev -- --open
```

### Building for Production
```bash
npm run build
```

### Running Storybook
```bash
npm run storybook
