// src/lib/utils/placeholder-parser.ts
export interface PlaceholderParams {
  ratio?: string;
  name?: string;
  [key: string]: string | undefined;
}

export function parsePlaceholder(layerName: string): PlaceholderParams | null {
  // Check if this is a placeholder layer
  if (!layerName.startsWith('placeholder?')) {
    return null;
  }

  try {
    // Extract the query string part
    const queryString = layerName.substring('placeholder?'.length);
    
    // Parse the query string
    const params: PlaceholderParams = {};
    const searchParams = new URLSearchParams(queryString);
    
    // Convert to object
    for (const [key, value] of searchParams.entries()) {
      params[key] = value;
    }
    
    return params;
  } catch (error) {
    console.error('Error parsing placeholder:', error);
    return null;
  }
}
