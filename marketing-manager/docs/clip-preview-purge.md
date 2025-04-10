# Clip Preview Purge Functionality

This document explains the clip preview purge functionality that automatically cleans up unused clip preview images.

## Overview

The application stores preview images for clips in the `static/clip-previews` directory. Over time, as clips are deleted or modified, some of these preview images may become unused and take up unnecessary disk space. The purge functionality identifies and removes these unused images.

## Automatic Purging

The system automatically purges unused clip preview images whenever a new clip preview is uploaded. This happens in the background and doesn't affect the performance of the upload operation.

The automatic purge process:

1. Retrieves all clips from the database
2. Identifies which clip IDs are currently in use
3. Scans the `static/clip-previews` directory for PNG files
4. Deletes any files that don't correspond to clips in the database

## Manual Purging

### API Endpoint

You can manually trigger a purge operation by calling the following API endpoint:

```
GET /api/maintenance/purge-clip-previews
```

Query parameters:
- `dry_run=true|false` (default: false) - If true, only report what would be deleted without actually deleting
- `verbose=true|false` (default: false) - If true, include more detailed information in the response

Example:
```
GET /api/maintenance/purge-clip-previews?dry_run=true&verbose=true
```

### Command Line Script

For maintenance purposes, you can also run the purge operation from the command line:

```bash
# Run in normal mode (will delete unused files)
node purge-clip-previews.js

# Run in dry-run mode (will only report what would be deleted)
node purge-clip-previews.js --dry-run

# Run with verbose output
node purge-clip-previews.js --verbose

# Combine options
node purge-clip-previews.js --dry-run --verbose
```

## Implementation Details

The purge functionality is implemented in:

1. `src/lib/server/utils/purgeClipPreviews.ts` - Core utility function
2. `src/routes/api/upload/clip-preview/+server.ts` - Automatic purge on upload
3. `src/routes/api/maintenance/purge-clip-previews/+server.js` - API endpoint
4. `purge-clip-previews.js` - Command line script

The purge process uses a conservative approach to determine which files to delete:

1. Files that are directly referenced in the database are always kept
2. Files that match the pattern `clip-{id}.png` or `clip-{id}-{timestamp}.png` are kept if the clip ID exists in the database
3. The special `placeholder.png` file is always kept
4. All other files are considered unused and can be deleted

This approach ensures that we never delete files that might be needed by the application.
