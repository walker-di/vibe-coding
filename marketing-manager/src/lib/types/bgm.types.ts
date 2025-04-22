// BGM Types
export interface BgmFile {
  id: number;
  name: string;
  description: string | null;
  audioUrl: string;
  duration: number | null; // Duration in seconds
  fileSize: number | null; // Size in bytes
  createdAt: number;
  updatedAt: number | null;
}

export interface BgmFileListItem {
  id: number;
  name: string;
  description: string | null;
  audioUrl: string;
  duration: number | null;
  fileSize: number | null;
  createdAt: number;
}

export interface CreateBgmFileInput {
  name: string;
  description?: string | null;
  audioUrl: string;
  duration?: number | null;
  fileSize?: number | null;
}

export interface UpdateBgmFileInput {
  name?: string;
  description?: string | null;
  audioUrl?: string;
  duration?: number | null;
  fileSize?: number | null;
}
