<script lang="ts">
  // Props: piece - an object containing shape (2D array) and color
  export let piece: { shape: number[][], color: string } = { shape: [], color: 'transparent' };

  // Use the same color mapping as GameBoard, or define separately if needed
  const colors: { [key: string]: string } = {
    'cyan': 'cyan',
    'blue': 'blue',
    'orange': 'orange',
    'yellow': 'yellow',
    'lime': 'lime',
    'purple': 'purple',
    'red': 'red',
    'transparent': 'transparent' // Ensure transparent is handled
  };

  function getCellColor(cellValue: number): string {
    // In the piece shape, 1 usually means filled, 0 empty
    return cellValue === 1 ? (colors[piece.color] || 'grey') : 'transparent';
  }

  // Determine grid size dynamically based on the piece shape (max 4x4)
  $: gridRows = piece.shape.length;
  $: gridCols = piece.shape.length > 0 ? Math.max(...piece.shape.map(row => row.length)) : 0;
  $: maxDim = Math.max(gridRows, gridCols, 2); // Ensure minimum 2x2 for small pieces

</script>

<div class="next-block-preview" style="--grid-size: {maxDim};">
  {#if piece && piece.shape.length > 0}
    {#each Array(maxDim) as _, y}
      <div class="preview-row">
        {#each Array(maxDim) as _, x}
          {@const cellValue = piece.shape[y]?.[x] ?? 0}
          <div
            class="preview-cell"
            style:background-color={getCellColor(cellValue)}
          >
          </div>
        {/each}
      </div>
    {/each}
  {:else}
    <div class="preview-placeholder"></div>
  {/if}
</div>

<style>
  .next-block-preview {
    display: grid;
    grid-template-rows: repeat(var(--grid-size), 1fr);
    grid-template-columns: repeat(var(--grid-size), 1fr); /* Use columns for sizing */
    width: 80px; /* Fixed size for the preview area */
    height: 80px;
    margin: auto; /* Center in its container */
    border: 1px solid #ddd;
    background-color: #f8f9fa; /* Match card body background */
    padding: 5px; /* Small padding */
  }

  .preview-row {
    display: contents;
  }

  .preview-cell {
    aspect-ratio: 1 / 1; /* Maintain square cells */
    border: 1px solid rgba(0, 0, 0, 0.05); /* Very subtle border */
  }

  .preview-placeholder {
      width: 100%;
      height: 100%;
      background-color: #eee; /* Placeholder background */
  }
</style>
