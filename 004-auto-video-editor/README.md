ies
# AI Video Editor Project Plan

This document outlines the initial plan for the AI Video Editor application.

## 1. Domain

The core concepts involved in this application are:

*   **Project:** A container for a video editing session. Each project has a unique identifier and holds associated media and timeline information.
*   **Media:** Video or audio files uploaded by the user. Each media item has properties like source URL, duration, type (video/audio), and potentially metadata extracted by AI (e.g., transcripts, object detection).
*   **Timeline:** Represents the sequence and arrangement of media clips over time. It consists of tracks.
*   **Track:** A horizontal layer in the timeline used to organize media clips. There can be multiple video and audio tracks.
*   **Clip:** A segment of a media file placed on a track in the timeline. It has a start time, end time, and refers back to the original media source.
*   **User:** (Implicit) The person interacting with the editor. (We might need user accounts later).

## 1.1 Technology Stack

*   **Framework:** Svelte 5 / SvelteKit
*   **Language:** TypeScript
*   **Styling:** Bootstrap 5
*   **Database ORM:** Drizzle ORM
*   **Component Development:** Storybook
*   **Package Manager:** npm

## 2. UI Components

The user interface will be built around these key components, utilizing **Bootstrap 5** for styling and layout.

*   **Project List/Dashboard:** Displays existing projects and allows creating new ones.
*   **Project View:** The main editor interface for a single project.
    *   **Media Library/Bin:** Area to display uploaded media files for the current project. Allows users to drag media onto the timeline.
    *   **Timeline Editor:** The central part of the editor, visually representing the arrangement of clips on tracks over time.
        *   **Tracks:** Multiple horizontal lanes for video and audio clips.
        *   **Clips:** Visual representations of media segments on tracks, showing thumbnails for video and waveforms for audio.
        *   **Playhead:** A vertical line indicating the current playback position.
        *   **Time Ruler:** Displays time markers (e.g., seconds, minutes).
        *   **Controls:** Play, pause, rewind, fast-forward, zoom controls for the timeline.
        *   **Editing Tools:** (Future) Tools for splitting, trimming, moving clips (like the scissors icon in the image).
    *   **Preview Window:** (Implicit, but necessary) Displays the video output at the current playhead position.
    *   **Upload Area:** A dedicated section or modal for uploading video/audio files.

## 3. Routes

The application will need the following basic routes:

*   `/` or `/projects`: Displays the list of projects (Project List/Dashboard).
*   `/projects/new`: (Could be a modal/action on `/projects`) Handles the creation of a new project.
*   `/projects/:projectId`: Displays the main editor interface for a specific project (Project View).
*   `/api/projects` (GET, POST): API endpoint for CRUD operations on projects.
*   `/api/projects/:projectId/media` (GET, POST, DELETE): API endpoint for uploading and managing media files within a project.
*   `/api/projects/:projectId/timeline` (GET, PUT): API endpoint for saving/loading the timeline state for a project.
*   `/api/projects/:projectId/export` (POST): API endpoint for triggering video export using FFmpeg.

## 4. Schema (Conceptual Data Structures)

We'll need data structures to represent our domain concepts, likely stored in a database.

**Project Schema:**

```json
{
  "id": "uuid", // Unique project identifier
  "name": "string",
  "createdAt": "timestamp",
  "updatedAt": "timestamp",
  "userId": "uuid" // Optional: If we add user accounts
}
```

**Media Schema:**

```json
{
  "id": "uuid", // Unique media identifier
  "projectId": "uuid", // Foreign key to Project
  "name": "string", // Original filename or user-defined name
  "type": "enum('video', 'audio')",
  "sourceUrl": "string", // URL to the stored media file (e.g., S3)
  "duration": "number", // Duration in seconds
  "uploadedAt": "timestamp",
  "metadata": { // Optional: For AI-extracted data
    "transcript": "string",
    "objects": ["string"],
    "scenes": ["object"]
  }
}
```

**Timeline Schema:** (This could be a single JSON blob stored with the Project or have its own tables)

```json
{
  "projectId": "uuid", // Foreign key to Project
  "tracks": [
    {
      "id": "uuid", // Unique track identifier
      "type": "enum('video', 'audio')",
      "clips": [
        {
          "id": "uuid", // Unique clip identifier
          "mediaId": "uuid", // Foreign key to Media
          "trackId": "uuid", // Foreign key to Track
          "startTime": "number", // Start time on the timeline (seconds)
          "endTime": "number", // End time on the timeline (seconds)
          "sourceStartTime": "number", // Start time within the original media (seconds)
          "sourceEndTime": "number" // End time within the original media (seconds)
        }
      ]
    }
  ],
  "totalDuration": "number" // Calculated total duration of the timeline
}

---

## Environment Setup

1.  **Install Dependencies:**
    ```bash
    npm install
    ```
2.  **Configure Environment Variables:**
    *   Copy `.env.example` to `.env`.
    *   Fill in the required values in `.env` (e.g., database connection string).
4.  **FFmpeg Installation (Required for Video Export):**
    *   The video export feature relies on FFmpeg. Ensure FFmpeg is installed on the system running the backend server and that the `ffmpeg` command is accessible via the system's PATH.
5.  **Database Migrations (Initial Setup & After Schema Changes):**
    *   Generate migration files (if schema changed): `npx drizzle-kit generate`
    *   Apply migrations: `npx drizzle-kit migrate`

## Development Workflow

We follow an iterative process for development:

1.  **Review Plan:** Start by reading the `README.md`, paying close attention to the "Current Sprint Focus" and "Implementation Plan / TODO List" sections to understand the next required task.
2.  **Plan:** Discuss and agree on the specific implementation steps for the next task (using Plan Mode if necessary).
3.  **Implement:** Execute the planned steps, such as creating/modifying components, stories, API endpoints, or database schemas (using Act Mode).
4.  **Test & Refine:** Run Storybook, tests (if applicable), or manually check functionality. Fix any bugs or address issues identified during implementation.
5.  **Update Status:** Mark the completed task as "Done" in the "Current Sprint Focus" table and check off the corresponding item(s) in the "Implementation Plan / TODO List".
6.  **Improve Process:** Suggest and potentially implement improvements to the `README.md` or the workflow itself to enhance clarity and efficiency for future iterations.

## Development Methodology

We will follow a **Behavior-Driven Development (BDD)** approach, focusing on building UI components in isolation first using Storybook. This ensures components are well-defined, visually tested, and functional before integrating them into SvelteKit routes and connecting them to backend APIs.

### Running Storybook

To view and interact with the UI components in isolation, run Storybook:

```bash
npm run storybook
```

This will start the Storybook development server, usually on port 6006.

**Storybook Format:**
> We are using the Component Story Format (CSF) 3.0 for writing stories, utilizing `<script module>` and `defineMeta` from `@storybook/addon-svelte-csf`. Please refer to existing stories like `src/stories/Button.stories.svelte` and `src/stories/ProjectList.stories.svelte` as examples when creating new stories.

---

## Current Sprint Focus (Phase 3: Timeline Editor UI - Initial)

| Task                                                    | Area     | Status | Notes                                                                    |
| :------------------------------------------------------ | :------- | :----- | :----------------------------------------------------------------------- |
| Research/Select Timeline Library or Plan Custom Impl. | Frontend | Done   | Selected `svelte-dnd-action`                                             |
| `TimelineEditor.svelte` Component & Story             | Frontend | Done   | Basic component with track/clip rendering, zoom, D&D (within track)      |
| Implement Drag-and-Drop in Story                      | Frontend | Done   | Implemented within-track D&D using `svelte-dnd-action`                   |
| Implement Playhead & Time Ruler in Story              | Frontend | Done   | Added basic visual representation, updates with zoom                     |
| API: Save Timeline State (POST/PUT /api/.../timeline) | Backend  | Done   | Endpoint logic and DB update (JSON blob)                                 |
| API: Load Timeline State (GET /api/.../timeline)      | Backend  | Done   | Endpoint logic and DB query                                              |
| Integration: Add `TimelineEditor` to Project Page     | Frontend | Done   | Placed component in the editor layout (`+page.svelte`)                   |
| Integration: Save/Load Timeline State                 | Frontend | Done   | Connected component via `bind:timeline` and `$effect` for auto-save      |
| **Fix: Media Library Thumbnails**                       | **Both** | **Done** | **Backend generates thumbnails, frontend displays them.**                |
| **Feature: Click Media to Add to Timeline**             | Frontend | **Done** | **Clicking item in Media Library adds it to first compatible/new track.** |
| **Investigate Timeline Scaling Bug**                    | Frontend | ToDo | Check reactivity/timing of totalDuration/pixelsPerSecond effects, parent component (`+page.svelte`) data loading/interaction, initial render state. |
| **Refine Clip Moving (Snapping, Cross-Track)**          | Frontend | In Progress | Implement snapping behavior and allow moving clips between tracks.       |

---

## Implementation Plan / TODO List (Component-First Approach)

This section outlines the planned steps to build the application based on the defined domain, UI, routes, and schema.

### Phase 1: Core Project Management & Setup

*   [x] **Backend:** Set up database connection (using Drizzle ORM as configured). (Done: Schema updated, migrations run)
*   [x] **Backend:** Implement API endpoint (`/api/projects`) for creating new projects (POST).
    *   [x] Define request/response types. (Implicitly done in +server.ts)
    *   [x] Implement database logic to insert a new project record. (Done in +server.ts)
*   [x] **Backend:** Implement API endpoint (`/api/projects`) for listing existing projects (GET).
    *   [x] Define response type. (Implicitly done in +server.ts)
    *   [x] Implement database logic to fetch projects. (Done in +server.ts)
*   [x] **Frontend (Storybook):** Create `ProjectList.svelte` component and `ProjectList.stories.svelte`. (Done)
*   [x] **Frontend (Storybook):** Create `CreateProjectModal.svelte` component (or similar for project creation UI) and its story. (Done)
*   [x] **Frontend (Integration):** Create SvelteKit route (`/projects` or `/`) to display the project list. (Done: `src/routes/projects/+page.svelte`)
*   [x] **Frontend (Integration):** Fetch project data from the API in the `/projects` page client-side and pass to `ProjectList.svelte`. (Done)
*   [x] **Frontend (Integration):** Integrate `CreateProjectModal.svelte` with the "Create New Project" button in the `/projects` page and connect to the POST `/api/projects` endpoint. (Done)
*   [x] **Frontend (Integration):** Implement navigation from `ProjectList.svelte` items to the project editor view (e.g., `/projects/[projectId]`). (Done)

### Phase 2: Project Editor View & Media Upload

*   [x] **Frontend (Storybook):** Create `MediaUpload.svelte` component and story. (Done)
*   [x] **Frontend (Storybook):** Create `MediaLibrary.svelte` component and story. (Done)
*   [x] **Frontend (Storybook):** Create basic layout component for the editor view (`ProjectEditorLayout.svelte`?) and story. (Done)
*   [x] **Backend:** Set up file storage solution (e.g., local storage for dev, S3/Cloudflare R2 for prod - requires configuration). (Done: Local storage at `/static/uploads/`)
*   [x] **Backend:** Implement API endpoint (`/api/projects/[projectId]/media`) for handling file uploads (POST).
    *   [x] Handle multipart/form-data. (Done in +server.ts)
    *   [x] Save file to storage. (Done: Saves to `/static/uploads/[projectId]/`)
    *   [x] Create media record in the database linked to the project. (Done in +server.ts)
*   [x] **Backend:** Implement API endpoint (`/api/projects/[projectId]/media`) to list media for a project (GET). (Done in +server.ts)
*   [x] **Frontend (Integration):** Create SvelteKit route (`/projects/[projectId]`) for the main editor view, using the layout component. (Done: Basic page exists, uses layout)
*   [x] **Frontend (Integration):** Integrate `MediaUpload.svelte` and `MediaLibrary.svelte` into the `/projects/[projectId]` route. (Done)
*   [x] **Frontend (Integration):** Connect `MediaUpload.svelte` to the upload API. (Done)
*   [x] **Frontend (Integration):** Connect `MediaLibrary.svelte` to the GET media API. (Done)

### Phase 3: Timeline Editor UI (Initial)

*   [x] **Frontend (Storybook):** Research/Select a Svelte library for timeline visualization or plan custom implementation. (Selected `svelte-dnd-action`)
*   [x] **Frontend (Storybook):** Create `TimelineEditor.svelte` component and story with basic track/clip rendering (using dummy data).
*   [x] **Frontend (Storybook):** Implement drag-and-drop functionality within the `TimelineEditor.svelte` story (or between mock MediaLibrary and Timeline). (Implemented within-track D&D)
*   [x] **Frontend (Storybook):** Create basic playhead and time ruler display within the story. (Added zoom controls as well)
*   [x] **Backend:** Implement API endpoint (`/api/projects/[projectId]/timeline`) for saving timeline state (PUT). (Done: `+server.ts` created)
*   [x] **Backend:** Implement API endpoint (`/api/projects/[projectId]/timeline`) for loading timeline state (GET). (Done: `+server.ts` created)
*   [x] **Frontend (Integration):** Integrate `TimelineEditor.svelte` into the `/projects/[projectId]` route. (Done: Added to `+page.svelte`)
*   [x] **Frontend (Integration):** Implement saving/loading timeline state to/from the backend API endpoints. (Done: Implemented fetch in `+page.svelte` and auto-save via `bind:timeline` and `$effect`)
*   [x] **Backend:** Extract media duration on upload using `ffprobe`. (Done in `media/+server.ts`)
*   [x] **Frontend (Integration):** Implement drag-and-drop from Media Library to Timeline. (Done in `MediaLibrary.svelte`, `TimelineEditor.svelte`, `+page.svelte`)
*   [x] **Frontend (Integration):** Implement click-to-add from Media Library to Timeline. (Done in `MediaLibrary.svelte`, `+page.svelte`)

### Phase 4: Advanced Timeline Editing & Core Features

*   [x] **Frontend (Integration):** Implement video preview playback synchronized with timeline (`PreviewPlayer.svelte` + integration in `+page.svelte`).
*   [x] **Frontend (Timeline):** Implement basic clip trimming via handles (`TimelineEditor.svelte`).
*   [x] **Frontend (Timeline):** Implement basic clip splitting at playhead (`TimelineEditor.svelte`).
*   [ ] **Frontend (Timeline):** Refine clip moving (snapping, cross-track).
    *   [ ] **Cross-Track:** Modify `handleDndFinalize` to correctly remove the clip from its source track when moved to a different track.
    *   [ ] **Snapping:** Implement snapping logic in `handleDndFinalize` to snap moved clips to the playhead or other clip edges on the same track.
    *   [ ] **Overlap:** Add basic overlap detection after snapping to prevent snaps that cause collisions (revert snap if overlap occurs).

### Phase 5: AI & Audio (Future)

*   [ ] Integrate AI services for transcription, object detection, etc.
*   [ ] Add audio waveform generation/display.

### Phase 6: User Management & Polish (Future)

*   [ ] User Authentication.
*   [x] **Video Export:** Implement backend endpoint using FFmpeg to export the timeline as a video file.
*   [ ] ... more features (e.g., effects, transitions)
