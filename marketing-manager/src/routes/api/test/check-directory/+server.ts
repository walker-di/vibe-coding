import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import fsPromises from 'fs/promises';
import path from 'path';

export const GET: RequestHandler = async () => {
  try {
    // Check if the directory exists
    const imageDir = path.join('static', 'uploads', 'gen');
    try {
      await fsPromises.mkdir(imageDir, { recursive: true });
      console.log(`Directory ${imageDir} created or already exists`);
    } catch (mkdirError: any) {
      console.error(`Failed to create image directory ${imageDir}:`, mkdirError);
      return json({
        success: false,
        error: `Failed to create directory: ${mkdirError.message}`
      });
    }

    // Try to write a test file
    const testFilePath = path.join(imageDir, 'test.txt');
    try {
      await fsPromises.writeFile(testFilePath, 'This is a test file');
      console.log(`Test file written to ${testFilePath}`);
    } catch (writeError: any) {
      console.error(`Failed to write test file to ${testFilePath}:`, writeError);
      return json({
        success: false,
        error: `Failed to write test file: ${writeError.message}`
      });
    }

    // Try to read the test file
    try {
      const content = await fsPromises.readFile(testFilePath, 'utf-8');
      console.log(`Test file read from ${testFilePath}: ${content}`);
    } catch (readError: any) {
      console.error(`Failed to read test file from ${testFilePath}:`, readError);
      return json({
        success: false,
        error: `Failed to read test file: ${readError.message}`
      });
    }

    // List all files in the directory
    try {
      const files = await fsPromises.readdir(imageDir);
      console.log(`Files in ${imageDir}:`, files);
    } catch (readDirError: any) {
      console.error(`Failed to read directory ${imageDir}:`, readDirError);
      return json({
        success: false,
        error: `Failed to read directory: ${readDirError.message}`
      });
    }

    return json({
      success: true,
      message: 'Directory check successful'
    });
  } catch (error: any) {
    console.error('Error checking directory:', error);
    return json({
      success: false,
      error: error.message || 'Unknown error'
    });
  }
};
