// src/lib/gameLogic.ts

export const BOARD_WIDTH = 10;
export const BOARD_HEIGHT = 20;

export const PIECES = {
  'I': {
    shape: [
      [0, 0, 0, 0],
      [1, 1, 1, 1],
      [0, 0, 0, 0],
      [0, 0, 0, 0]
    ],
    color: 'cyan',
    id: 1
  },
  'J': {
    shape: [
      [1, 0, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'blue',
    id: 2
  },
  'L': {
    shape: [
      [0, 0, 1],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'orange',
    id: 3
  },
  'O': {
    shape: [
      [1, 1],
      [1, 1]
    ],
    color: 'yellow',
    id: 4
  },
  'S': {
    shape: [
      [0, 1, 1],
      [1, 1, 0],
      [0, 0, 0]
    ],
    color: 'lime', // Often green, using lime for better visibility
    id: 5
  },
  'T': {
    shape: [
      [0, 1, 0],
      [1, 1, 1],
      [0, 0, 0]
    ],
    color: 'purple',
    id: 6
  },
  'Z': {
    shape: [
      [1, 1, 0],
      [0, 1, 1],
      [0, 0, 0]
    ],
    color: 'red',
    id: 7
  }
};

export type PieceType = keyof typeof PIECES;
export type PieceData = {
    shape: number[][];
    color: string;
    id: number;
};
export type Board = (number | string)[][]; // 0 for empty, piece ID or color string for filled

// Function to create an empty game board
export function createBoard(): Board {
  return Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
}

// Function to get a random piece type
export function getRandomPieceType(): PieceType {
  const pieceTypes = Object.keys(PIECES) as PieceType[];
  const randomIndex = Math.floor(Math.random() * pieceTypes.length);
  return pieceTypes[randomIndex];
}

// Function to get the data for a specific piece type
export function getPieceData(type: PieceType): PieceData {
    return PIECES[type];
}

// Represents the current state of a falling piece
export interface ActivePiece {
    x: number;
    y: number;
    pieceData: PieceData;
}

// Function to check if a piece's position is valid on the board
export function isValidMove(piece: ActivePiece, board: Board, offsetX: number = 0, offsetY: number = 0, newShape?: number[][]): boolean {
    const shape = newShape || piece.pieceData.shape;
    const checkX = piece.x + offsetX;
    const checkY = piece.y + offsetY;

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x] !== 0) { // Check only filled parts of the piece
                const boardX = checkX + x;
                const boardY = checkY + y;

                // Check boundaries
                if (boardX < 0 || boardX >= BOARD_WIDTH || boardY >= BOARD_HEIGHT) {
                    return false;
                }

                // Check collision with existing pieces on the board (only if within bounds)
                // Ensure boardY is not negative before accessing board[boardY]
                if (boardY >= 0 && board[boardY] && board[boardY][boardX] !== 0) {
                    return false;
                }
            }
        }
    }
    return true;
}

// Function to rotate a piece (clockwise)
export function rotate(pieceData: PieceData): number[][] {
    const shape = pieceData.shape;
    const N = shape.length;
    const newShape: number[][] = Array.from({ length: N }, () => Array(N).fill(0));

    for (let y = 0; y < N; y++) {
        for (let x = 0; x < N; x++) {
            newShape[x][N - 1 - y] = shape[y][x];
        }
    }
    return newShape;
}

// Function to place a piece onto the board permanently
export function placePiece(piece: ActivePiece, board: Board): Board {
    const newBoard = board.map(row => [...row]); // Create a copy
    const shape = piece.pieceData.shape;

    for (let y = 0; y < shape.length; y++) {
        for (let x = 0; x < shape[y].length; x++) {
            if (shape[y][x] !== 0) {
                const boardX = piece.x + x;
                const boardY = piece.y + y;
                // Only place if within board bounds (should be guaranteed by isValidMove checks before calling this)
                if (boardY >= 0 && boardY < BOARD_HEIGHT && boardX >= 0 && boardX < BOARD_WIDTH) {
                    newBoard[boardY][boardX] = piece.pieceData.id; // Use ID or color
                }
            }
        }
    }
    return newBoard;
}

// Function to clear completed lines and return the new board, number of lines cleared, and their indices
export function clearLines(board: Board): { newBoard: Board, linesCleared: number, clearedRowIndices: number[] } {
    let newBoard = board.map(row => [...row]);
    let linesCleared = 0;
    const clearedRowIndices: number[] = [];

    for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
        // Check if the row is full
        if (newBoard[y].every(cell => cell !== 0)) {
            linesCleared++;
            clearedRowIndices.push(y); // Record the index of the cleared line
            // Remove the full row
            newBoard.splice(y, 1);
            // Add a new empty row at the top
            newBoard.unshift(Array(BOARD_WIDTH).fill(0));
            // Re-check the same row index again as rows above have shifted down
            y++;
        }
    }

    // Sort indices descending so effects can be applied easily if needed
    clearedRowIndices.sort((a, b) => b - a);

    return { newBoard, linesCleared, clearedRowIndices };
}

// --- TODO: Add scoring and level logic ---
