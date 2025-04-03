<script lang="ts">
  // Props:
  // board - a 2D array representing the game grid
  // clearingLines - array of row indices currently being cleared for animation
  export let board: (number | string)[][] = [];
  export let clearingLines: number[] = []; // Added prop for animation state

  // Example colors - these will likely be refined later based on game logic
  const colors: { [key: string]: string } = {
    '1': 'cyan',    // I piece
    '2': 'blue',    // J piece
    '3': 'orange',  // L piece
    '4': 'yellow',  // O piece
    '5': 'lime',    // S piece
    '6': 'purple',  // T piece
    '7': 'red'      // Z piece
  };

  function getCellColor(cellValue: number | string): string {
    if (typeof cellValue === 'string' && colors[cellValue]) {
      return colors[cellValue];
    }
    if (typeof cellValue === 'number' && cellValue > 0 && colors[cellValue.toString()]) {
       return colors[cellValue.toString()];
    }
    return 'transparent'; // Default for empty cells (0)
  }

</script>

<div class="game-board">
  {#if board && board.length > 0}
    {#each board as row, y}
      <div class="board-row">
        {#each row as cell, x}
          <div
            class="board-cell"
            style:background-color={getCellColor(cell)}
            class:clearing={clearingLines.includes(y)}
          >
            <!-- Optional: Display cell value for debugging -->
            <!-- {cell} -->
          </div>
        {/each}
      </div>
    {/each}
  {:else}
    <p>Loading board...</p>
  {/if}
</div>

<style>
  .game-board {
    display: grid;
    /* Adjust grid template based on board dimensions if needed */
    /* Assuming board is always the same size for now */
    grid-template-rows: repeat(20, 1fr); /* Example: 20 rows */
    grid-template-columns: repeat(10, 1fr); /* Added: 10 columns */
    border: 1px solid #ccc;
    background-color: #e9ecef; /* Light background for the grid */
    aspect-ratio: 10 / 20; /* Standard Tetris aspect ratio (Width/Height) */
    width: 100%; /* Make it responsive within its container */
    max-width: 300px; /* Max width to maintain blocky feel */
    margin: auto; /* Center the board if container is wider */
  }

  .board-row {
    display: contents; /* Allows cells to be direct children of the grid */
  }

  .board-cell {
    /* border: 1px solid #eee; /* Light border for cell visibility */
    /* Make cells square */
    aspect-ratio: 1 / 1;
    border: 1px solid rgba(0, 0, 0, 0.1); /* Subtle border */
  }

  /* Example: Add styles for filled cells if needed */
  .board-cell[style*="background-color: transparent"] {
     /* Style for empty cells if needed */
  }
  /* Removed unused style for transparent cells */

  /* --- Line Clear Animation --- */
  .board-cell.clearing {
    animation: simple_flash 0.5s ease-out;
    /* Remove the background override for now */
    /* background-color: white !important; */
  }

  @keyframes simple_flash {
    0%, 100% {
        opacity: 1;
    }
    50% {
        opacity: 0.1; /* Simple blink */
    }
  }
</style>
