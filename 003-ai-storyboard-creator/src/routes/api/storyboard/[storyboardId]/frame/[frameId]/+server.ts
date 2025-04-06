import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { storyboardFrames } from '$lib/server/db/schema';
import { eq, and, gt, sql } from 'drizzle-orm';

export const DELETE: RequestHandler = async ({ params }) => {
  const { storyboardId, frameId } = params;

  if (!storyboardId || !frameId) {
    throw error(400, 'Missing storyboardId or frameId parameter');
  }

  console.log(`Request to delete frame ${frameId} from storyboard ${storyboardId}`);

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Find the frame to be deleted to get its order
      const frameToDelete = await tx.select({ frameOrder: storyboardFrames.frameOrder })
                                    .from(storyboardFrames)
                                    .where(and(
                                        eq(storyboardFrames.storyboardId, storyboardId),
                                        eq(storyboardFrames.id, frameId)
                                    ))
                                    .limit(1);

      if (frameToDelete.length === 0) {
        // Frame already deleted or never existed, consider this success or 404?
        // Let's return 404 for clarity
        throw error(404, `Frame with ID ${frameId} not found in storyboard ${storyboardId}.`);
      }
      const deletedFrameOrder = frameToDelete[0].frameOrder;

      // 2. Delete the frame
      const deleteResult = await tx.delete(storyboardFrames)
                                   .where(and(
                                       eq(storyboardFrames.storyboardId, storyboardId),
                                       eq(storyboardFrames.id, frameId)
                                   )).run(); // Use run() to get the result info

      // Check the 'changes' property for better-sqlite3
      if (deleteResult.changes === 0) {
         // Should not happen if select found it, but good practice
         console.warn(`Frame ${frameId} was selected but delete operation reported 0 changes.`);
         // Consider if this should be a 404 or 500. 500 seems appropriate if the select succeeded.
         throw error(500, 'Failed to delete frame after finding it (0 changes reported).');
      }

      // 3. Update the frameOrder of subsequent frames
      await tx.update(storyboardFrames)
              .set({ frameOrder: sql`${storyboardFrames.frameOrder} - 1` })
              .where(and(
                  eq(storyboardFrames.storyboardId, storyboardId),
                  gt(storyboardFrames.frameOrder, deletedFrameOrder)
              ));

      console.log(`Successfully deleted frame ${frameId} (order ${deletedFrameOrder}) and updated subsequent frame orders.`);
      return { deletedFrameId: frameId };
    });

    return json({
      message: `Successfully deleted frame ${result.deletedFrameId}.`,
      deletedFrameId: result.deletedFrameId
    }, { status: 200 }); // 200 OK for successful deletion

  } catch (err: any) {
    console.error(`Error deleting frame ${frameId} from storyboard ${storyboardId}:`, err);
    if (err.status) { // Re-throw kit errors (like the 404)
        throw err;
    }
    throw error(500, `Internal Server Error deleting frame: ${err.message || 'Unknown DB error'}`);
  }
};
