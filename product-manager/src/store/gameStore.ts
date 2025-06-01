import { writable, derived } from 'svelte/store';
import { gameEngine } from '../engine/gameEngine';
import type {
    GameState,
    BaseNodeData,
    EdgeData,
    CompanyFinances,
    GameAction,
    ActionResult
} from '../types';

// Initialize with current game state
let initialGameState = gameEngine.getState();

// Create writable stores
export const gameState = writable<GameState>({
    nodes: [...initialGameState.nodes],
    edges: [...initialGameState.edges],
    companyFinances: { ...initialGameState.companyFinances },
    currentTick: initialGameState.currentTick,
    availableIdeas: [...initialGameState.availableIdeas],
    gameSpeed: initialGameState.gameSpeed,
    isPaused: initialGameState.isPaused
});

// Convenient accessors
export const nodes = derived(gameState, $gameState => $gameState.nodes);
export const edges = derived(gameState, $gameState => $gameState.edges);
export const companyFinances = derived(gameState, $gameState => $gameState.companyFinances);
export const currentTick = derived(gameState, $gameState => $gameState.currentTick);
export const availableIdeas = derived(gameState, $gameState => $gameState.availableIdeas);
export const gameSpeed = derived(gameState, $gameState => $gameState.gameSpeed);
export const isPaused = derived(gameState, $gameState => $gameState.isPaused);

// Derived states for computed values
export const totalSalaryExpenses = derived(gameState, $gameState => {
    return $gameState.nodes
        .filter(node => node.type === 'Personnel')
        .reduce((total, personnel: any) => total + (personnel.salary || 0), 0);
});

export const totalPersonnel = derived(gameState, $gameState => {
    return $gameState.nodes.filter(node => node.type === 'Personnel').length;
});

export const totalProducts = derived(gameState, $gameState => {
    return $gameState.nodes.filter(node => node.type === 'Product').length;
});

export const activeTasks = derived(gameState, $gameState => {
    return $gameState.nodes.filter(node => node.type === 'Task' && (node as any).progress < 1);
});

export const completedTasks = derived(gameState, $gameState => {
    return $gameState.nodes.filter(node => node.type === 'Task' && (node as any).progress >= 1);
});

// Listen to game engine state changes
gameEngine.on('stateChanged', (newState: GameState) => {
    // Update the store
    gameState.set({
        nodes: [...newState.nodes],
        edges: [...newState.edges],
        companyFinances: { ...newState.companyFinances },
        currentTick: newState.currentTick,
        availableIdeas: [...newState.availableIdeas],
        gameSpeed: newState.gameSpeed,
        isPaused: newState.isPaused
    });
});

// Action dispatchers
export function dispatchGameAction(action: GameAction): ActionResult {
    const result = gameEngine.performAction(action);
    
    if (!result.success) {
        console.error("Game action failed:", result.message);
        // Could emit a notification here
    }
    
    return result;
}

// Convenience action functions
export function addNode(nodeData: BaseNodeData): ActionResult {
    return dispatchGameAction({
        type: 'ADD_NODE',
        payload: nodeData
    });
}

export function removeNode(nodeId: string): ActionResult {
    return dispatchGameAction({
        type: 'REMOVE_NODE',
        payload: { nodeId }
    });
}

export function addEdge(edgeData: EdgeData): ActionResult {
    return dispatchGameAction({
        type: 'ADD_EDGE',
        payload: edgeData
    });
}

export function removeEdge(edgeId: string): ActionResult {
    return dispatchGameAction({
        type: 'REMOVE_EDGE',
        payload: { edgeId }
    });
}

export function assignPersonnelToTask(personnelId: string, taskId: string): ActionResult {
    return dispatchGameAction({
        type: 'ASSIGN_PERSONNEL_TO_TASK',
        payload: { personnelId, taskId }
    });
}

export function pauseGame(): ActionResult {
    return dispatchGameAction({
        type: 'PAUSE_GAME',
        payload: {}
    });
}

export function resumeGame(): ActionResult {
    return dispatchGameAction({
        type: 'RESUME_GAME',
        payload: {}
    });
}

export function setGameSpeed(speed: number): ActionResult {
    return dispatchGameAction({
        type: 'SET_GAME_SPEED',
        payload: { speed }
    });
}

export function hirePersonnel(personnelTemplate: any): ActionResult {
    return dispatchGameAction({
        type: 'HIRE_PERSONNEL',
        payload: personnelTemplate
    });
}

export function firePersonnel(personnelId: string): ActionResult {
    return dispatchGameAction({
        type: 'FIRE_PERSONNEL',
        payload: { personnelId }
    });
}

export function createTask(taskData: any): ActionResult {
    return dispatchGameAction({
        type: 'CREATE_TASK',
        payload: taskData
    });
}

// Game control functions
export function startGame() {
    // Ensure the store is initialized with the current game state
    const currentState = gameEngine.getState();

    gameState.set({
        nodes: [...currentState.nodes],
        edges: [...currentState.edges],
        companyFinances: { ...currentState.companyFinances },
        currentTick: currentState.currentTick,
        availableIdeas: [...currentState.availableIdeas],
        gameSpeed: currentState.gameSpeed,
        isPaused: currentState.isPaused
    });

    gameEngine.startGameLoop();
}

export function stopGame() {
    gameEngine.stopGameLoop();
}

// Utility functions to get specific node types
export function getNodeById(nodeId: string): BaseNodeData | undefined {
    let currentState: GameState;
    const unsubscribe = gameState.subscribe(state => currentState = state);
    unsubscribe();
    return currentState!.nodes.find(node => node.id === nodeId);
}

export function getNodesByType(nodeType: string): BaseNodeData[] {
    let currentState: GameState;
    const unsubscribe = gameState.subscribe(state => currentState = state);
    unsubscribe();
    return currentState!.nodes.filter(node => node.type === nodeType);
}

export function getPersonnel(): BaseNodeData[] {
    return getNodesByType('Personnel');
}

export function getProducts(): BaseNodeData[] {
    return getNodesByType('Product');
}

export function getTasks(): BaseNodeData[] {
    return getNodesByType('Task');
}

export function getResources(): BaseNodeData[] {
    return getNodesByType('Resource');
}

export function getIdeas(): BaseNodeData[] {
    return getNodesByType('Idea');
}

export function getMarkets(): BaseNodeData[] {
    return getNodesByType('Market');
}
