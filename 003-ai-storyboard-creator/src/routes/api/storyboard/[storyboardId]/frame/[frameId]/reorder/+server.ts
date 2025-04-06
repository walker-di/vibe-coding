import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { db } from '$lib/server/db';
import { storyboardFrames } from '$lib/server/db/schema';
import { eq, and, lt, gt, desc, asc, sql } from 'drizzle-orm';

export const POST: RequestHandler = async ({ request, params }) => {
  const { storyboardId, frameId } = params;
  let direction: 'up' | 'down';

  if (!storyboardId || !frameId) {
    throw error(400, 'Missing storyboardId or frameId parameter');
  }

  try {
    const requestData = await request.json();
    if (requestData.direction !== 'up' && requestData.direction !== 'down') {
      throw error(400, 'Invalid or missing "direction" in request body. Must be "up" or "down".');
    }
    direction = requestData.direction;
  } catch (err: unknown) { // Explicitly type err as unknown
    if (err instanceof SyntaxError && err.message.includes('JSON')) {
      throw error(400, 'Invalid JSON in request body');
    }
    // Check if it's an HttpError from @sveltejs/kit
    if (typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number') {
        throw err; // Re-throw kit errors
    }
    // Check if it has a message property
    const message = (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string')
                    ? err.message
                    : 'Unknown error';
    throw error(400, `Error parsing request body: ${message}`);
  }

  console.log(`Request to reorder frame ${frameId} ${direction} in storyboard ${storyboardId}`);

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Find the frame being moved (frame A)
      const frameA = await tx.select({ id: storyboardFrames.id, frameOrder: storyboardFrames.frameOrder })
                             .from(storyboardFrames)
                             .where(and(
                                 eq(storyboardFrames.storyboardId, storyboardId),
                                 eq(storyboardFrames.id, frameId)
                             ))
                             .limit(1);

      if (frameA.length === 0) {
        throw error(404, `Frame ${frameId} not found.`);
      }
      const frameAOrder = frameA[0].frameOrder;

      // 2. Find the adjacent frame to swap with (frame B)
      let frameB;
      if (direction === 'up') {
        // Find the frame with the highest order *less than* frame A's order
        frameB = await tx.select({ id: storyboardFrames.id, frameOrder: storyboardFrames.frameOrder })
                         .from(storyboardFrames)
                         .where(and(
                             eq(storyboardFrames.storyboardId, storyboardId),
                             lt(storyboardFrames.frameOrder, frameAOrder)
                         ))
                         .orderBy(desc(storyboardFrames.frameOrder))
                         .limit(1);
      } else { // direction === 'down'
        // Find the frame with the lowest order *greater than* frame A's order
        frameB = await tx.select({ id: storyboardFrames.id, frameOrder: storyboardFrames.frameOrder })
                         .from(storyboardFrames)
                         .where(and(
                             eq(storyboardFrames.storyboardId, storyboardId),
                             gt(storyboardFrames.frameOrder, frameAOrder)
                         ))
                         .orderBy(asc(storyboardFrames.frameOrder))
                         .limit(1);
      }

      if (frameB.length === 0) {
        // Frame is already at the top/bottom, cannot move further
        console.log(`Frame ${frameId} is already at the ${direction === 'up' ? 'top' : 'bottom'}. No reorder needed.`);
        // Return success but indicate no change occurred? Or throw a specific error?
        // Let's return a specific message indicating no operation.
        return { noOperation: true, message: `Frame already at ${direction === 'up' ? 'top' : 'bottom'}.` };
      }
      const frameBId = frameB[0].id;
      const frameBOrder = frameB[0].frameOrder;

      // 3. Swap the frameOrder values
      // Update Frame A to Frame B's order
      await tx.update(storyboardFrames)
              .set({ frameOrder: frameBOrder })
              .where(eq(storyboardFrames.id, frameId)); // Frame A's ID

      // Update Frame B to Frame A's original order
      await tx.update(storyboardFrames)
              .set({ frameOrder: frameAOrder })
              .where(eq(storyboardFrames.id, frameBId)); // Frame B's ID

      console.log(`Successfully swapped order of frame ${frameId} (now ${frameBOrder}) and frame ${frameBId} (now ${frameAOrder})`);
      return {
          movedFrameId: frameId,
          newOrder: frameBOrder,
          swappedWithFrameId: frameBId,
          swappedFrameNewOrder: frameAOrder
      };
    });

    // Handle the case where no operation was needed
    if (result.noOperation) {
        return json({ message: result.message }, { status: 200 }); // OK, but no change
    }

    return json({
      message: `Successfully moved frame ${result.movedFrameId} ${direction}.`,
      movedFrameId: result.movedFrameId,
      newOrder: result.newOrder
    }, { status: 200 });

  } catch (err: unknown) { // Explicitly type err as unknown
    console.error(`Error reordering frame ${frameId} ${direction} in storyboard ${storyboardId}:`, err);
    // Check if it's an HttpError from @sveltejs/kit
    if (typeof err === 'object' && err !== null && 'status' in err && typeof err.status === 'number') {
        throw err; // Re-throw kit errors
    }
     // Check if it has a message property
    const message = (typeof err === 'object' && err !== null && 'message' in err && typeof err.message === 'string')
                    ? err.message
                    : 'Unknown DB error';
    throw error(500, `Internal Server Error reordering frame: ${message}`);
  }
};
