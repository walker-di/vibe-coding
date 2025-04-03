<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import GameBoard from '$lib/GameBoard.svelte';
  import NextBlock from '$lib/NextBlock.svelte';
  import Scoreboard from '$lib/Scoreboard.svelte';
  import Controls from '$lib/Controls.svelte';
  import GameOverModal from '$lib/GameOverModal.svelte';
  import { BOARD_WIDTH, BOARD_HEIGHT, createBoard, getRandomPieceType, getPieceData, isValidMove, rotate, placePiece, clearLines, type PieceType, type PieceData, type ActivePiece, type Board } from '$lib/gameLogic';

  // Game state: 'initial', 'playing', 'paused', 'gameOver'
  let gameState: 'initial' | 'playing' | 'paused' | 'gameOver' = 'initial';

  // Removed duplicate startGame - the main one is below in Game Lifecycle Functions
  // Removed duplicate pauseGame, resumeGame, stopGame, restartGame placeholders as well.

  // Game data
  let score = 0;
  let level = 1;
  let board: Board = createBoard();
  let currentPiece: ActivePiece | null = null;
  let nextPieceType: PieceType | null = null;
  // Initialize nextPieceData with a default structure to avoid potential null issues in child components
  let nextPieceData: PieceData = { shape: [], color: 'transparent', id: 0 };

  let gameLoopInterval: number | null = null;
  let gameSpeed = 1000; // Milliseconds per step down, decreases with level
  let linesBeingCleared: number[] = []; // State for line clear animation

  // --- Game Lifecycle Functions ---

  function resetGame() {
    if (gameLoopInterval) clearInterval(gameLoopInterval);
    gameLoopInterval = null;
    board = createBoard();
    score = 0;
    level = 1;
    gameSpeed = 1000;
    currentPiece = null;
    nextPieceType = getRandomPieceType(); // Get the first 'next' piece
    nextPieceData = getPieceData(nextPieceType);
    spawnNewPiece(); // Spawn the initial piece
  }

  function startGame() {
    resetGame(); // Reset board, score, etc.
    gameState = 'playing';
    startLoop();
    console.log("Game Started!");
  }

   function spawnNewPiece() {
    if (!nextPieceType) { // Should only happen on first spawn
        nextPieceType = getRandomPieceType();
        nextPieceData = getPieceData(nextPieceType);
    }
    const pieceType = nextPieceType;
    const pieceData = nextPieceData!; // Assert non-null as it's set before spawn

    currentPiece = {
        pieceData: pieceData,
        x: Math.floor(BOARD_WIDTH / 2) - Math.floor(pieceData.shape[0].length / 2), // Center horizontally
        y: 0 // Start at the top
    };

    // Prepare the next piece
    nextPieceType = getRandomPieceType();
    nextPieceData = getPieceData(nextPieceType);

    // Check for game over condition immediately after spawning
    if (!isValidMove(currentPiece, board)) {
        gameOver();
    }
  }

  function gameStep() {
    if (!currentPiece || gameState !== 'playing') return;

    // Try moving down
    if (isValidMove(currentPiece, board, 0, 1)) {
      currentPiece.y++;
      // Trigger reactivity by reassigning
      currentPiece = currentPiece;
      board = board; // Also trigger board reactivity if needed for rendering piece
    } else {
      // Piece has landed
      board = placePiece(currentPiece, board); // Place piece first

      // Check for cleared lines
      const { newBoard, linesCleared, clearedRowIndices } = clearLines(board); // Get indices

      if (linesCleared > 0) {
        // Trigger animation state BEFORE updating the board visually
        linesBeingCleared = clearedRowIndices;
        // Update score and level
        updateScoreAndLevel(linesCleared);

        // Wait for animation to finish before updating board state and spawning next piece
        setTimeout(() => {
            board = newBoard; // Update board after animation
            linesBeingCleared = []; // Clear animation state
            spawnNewPiece(); // Spawn next piece after board update
        }, 500); // Match animation duration (0.5s)

      } else {
         // If no lines cleared, update board immediately and spawn next piece
         board = newBoard;
         spawnNewPiece();
      }
    } // This is the end of the main 'else' block for piece landing
  } // This is the correct end of the gameStep function

  function startLoop() {
     if (gameLoopInterval) clearInterval(gameLoopInterval);
     gameLoopInterval = setInterval(gameStep, gameSpeed);
  }

  function pauseGame() {
    if (gameState === 'playing' && gameLoopInterval) {
        clearInterval(gameLoopInterval);
        gameLoopInterval = null;
        gameState = 'paused';
        console.log("Game Paused!");
    }
  }

  function resumeGame() {
     if (gameState === 'paused') {
        gameState = 'playing';
        startLoop(); // Restart the loop
        console.log("Game Resumed!");
     }
  }

   function gameOver() {
       if (gameLoopInterval) clearInterval(gameLoopInterval);
       gameLoopInterval = null;
       gameState = 'gameOver';
       console.log("Game Over!");
   }

  function stopGame() {
    // Similar to game over, but maybe doesn't show score? Or goes back to initial?
    // For now, treat it like game over.
    gameOver();
    console.log("Game Stopped!");
  }

  function restartGame() {
    // Modal triggers this
    startGame(); // Start a completely new game
    console.log("Game Restarted!");
  }

  function updateScoreAndLevel(linesCleared: number) {
      // Basic scoring: 1 line = 40, 2 = 100, 3 = 300, 4 = 1200 (points * level)
      const points = [0, 40, 100, 300, 1200];
      score += (points[linesCleared] || 0) * level;

      // TODO: Implement level increase logic (e.g., every 10 lines)
      // TODO: Increase game speed based on level
  }

  // --- Input Handling ---
  function handleKeydown(event: KeyboardEvent) {
    if (!currentPiece || gameState !== 'playing') return;

    let moved = false;
    switch (event.key) {
      case 'ArrowLeft':
      case 'a':
        if (isValidMove(currentPiece, board, -1, 0)) {
          currentPiece.x--;
          moved = true;
        }
        break;
      case 'ArrowRight':
      case 'd':
        if (isValidMove(currentPiece, board, 1, 0)) {
          currentPiece.x++;
          moved = true;
        }
        break;
      case 'ArrowDown':
      case 's':
        // Move down faster or trigger immediate drop? For now, move one step
        if (isValidMove(currentPiece, board, 0, 1)) {
          currentPiece.y++;
          moved = true;
          // Optional: Reset interval timer for soft drop?
        } else {
            // If pressing down can't move, lock the piece immediately
            gameStep(); // Trigger lock, clear lines, spawn next
        }
        break;
      case 'ArrowUp':
      case 'w':
        // Rotate
        const rotatedShape = rotate(currentPiece.pieceData);
        if (isValidMove(currentPiece, board, 0, 0, rotatedShape)) {
            currentPiece.pieceData.shape = rotatedShape;
            moved = true;
        }
        // TODO: Add wall kick logic if desired
        break;
       case ' ': // Space bar for hard drop (optional)
         // TODO: Implement hard drop logic
         break;
    }

    if (moved) {
      // Trigger reactivity
      currentPiece = currentPiece;
    }
  }

  // --- Lifecycle ---
  onMount(() => {
    // Don't start game automatically, wait for button click

    // Add keyboard listener only on the client-side after mount
    window.addEventListener('keydown', handleKeydown);

    // Return cleanup function for onDestroy equivalent
    return () => {
        if (gameLoopInterval) clearInterval(gameLoopInterval);
        window.removeEventListener('keydown', handleKeydown);
    };
  });

  // onDestroy is not strictly needed now as cleanup is handled by onMount's return function
  // onDestroy(() => {
  //   // Clean up interval and listener
  //   if (gameLoopInterval) clearInterval(gameLoopInterval);
  //   // window.removeEventListener('keydown', handleKeydown); // Moved to onMount cleanup
  // });

  // Reactive declaration for the board to display (combines static board + current piece)
  $: displayBoard = (() => {
      if (!currentPiece || gameState === 'initial' || gameState === 'gameOver') {
          return board; // Show only static board when no piece active or game not running
      }
      // Create a temporary board copy to draw the current piece onto
      const tempBoard = board.map(row => [...row]);
      const { x: pieceX, y: pieceY, pieceData } = currentPiece;
      const { shape, id } = pieceData;

      for (let y = 0; y < shape.length; y++) {
          for (let x = 0; x < shape[y].length; x++) {
              if (shape[y][x] !== 0) {
                  const boardY = pieceY + y;
                  const boardX = pieceX + x;
                  // Only draw if within visible board bounds
                  if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                      tempBoard[boardY][boardX] = id; // Use piece ID for color lookup in GameBoard
                  }
              }
          }
      }
      return tempBoard;
  })();

</script>
<!-- <svelte:window on:keydown={handleKeydown}/> This is redundant if using window.addEventListener in onMount -->

<div class="container mt-3">
  <h1 class="text-center mb-4">Svelte Tetris</h1>
  <div class="row">
    <!-- Game Board Area -->
    <div class="col-md-7 col-lg-8">
      <div class="border p-2" style="min-height: 600px; background-color: #f8f9fa;">
        {#if gameState === 'initial'}
          <div class="d-flex justify-content-center align-items-center h-100 flex-column">
             <h2 class="mb-4">Tetris</h2>
             <button class="btn btn-primary btn-lg" on:click={startGame}>Iniciar</button>
          </div>
        {:else}
          <!-- Actual GameBoard component -->
          <GameBoard board={displayBoard} clearingLines={linesBeingCleared} />
        {/if}
      </div>
    </div>

    <!-- Side Panel Area -->
    <div class="col-md-5 col-lg-4">
      {#if gameState !== 'initial' && gameState !== 'gameOver'}
        <!-- Next Block Preview -->
        <div class="card mb-3">
          <div class="card-header">Próximo Bloco</div>
          <div class="card-body text-center">
             {#if nextPieceData}
                <NextBlock piece={nextPieceData} />
             {:else}
                 <p class="text-muted">...</p>
             {/if}
          </div>
        </div>

        <!-- Status -->
        <div class="card mb-3">
          <div class="card-header">Status</div>
          <div class="card-body">
             <Scoreboard {level} {score} />
          </div>
        </div>

        <!-- Controls -->
        <div class="card">
          <div class="card-header">Controles</div>
          <div class="card-body">
             <Controls {gameState} on:pause={pauseGame} on:resume={resumeGame} on:stop={stopGame} />
          </div>
        </div>
      {/if}
      {#if gameState === 'gameOver'}
         <div class="alert alert-info text-center">
             Pressione "Iniciar Novo Jogo" no modal.
         </div>
      {/if}
    </div>
  </div>

  <!-- Actual Game Over Modal -->
  <GameOverModal {level} {score} show={gameState === 'gameOver'} on:restart={restartGame} />

</div>

<style>
  /* Optional: Add custom styles if needed */
  .card {
      margin-bottom: 1rem; /* Ensure spacing between cards */
  }
  /* Removed unused .modal-backdrop style */
</style>
