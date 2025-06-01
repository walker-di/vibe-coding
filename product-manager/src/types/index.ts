// Core type definitions for ProductGraphTycoon

export type NodeType = 'Personnel' | 'Product' | 'Resource' | 'Task' | 'Market' | 'Idea';

export interface BaseNodeData {
    id: string; // Unique ID
    label: string; // Display name
    type: NodeType;
    description?: string;
    cost?: number; // e.g., salary, purchase price
    properties?: Record<string, any>; // Custom properties
    position?: { x: number; y: number }; // For Cytoscape positioning
}

export interface PersonnelData extends BaseNodeData {
    type: 'Personnel';
    skills: string[];
    efficiency: number; // 0-1
    morale: number; // 0-1
    salary: number;
    assignedToTaskId?: string;
}

export interface ProductData extends BaseNodeData {
    type: 'Product';
    version?: string;
    quality: number; // 0-1
    features: string[];
    developmentProgress: number; // 0-1
    marketFit?: number; // 0-1
}

export interface TaskData extends BaseNodeData {
    type: 'Task';
    requiredSkills: string[];
    timeToComplete: number; // in game ticks
    progress: number; // 0-1
    assignedPersonnelIds: string[];
    inputNodeIds: string[]; // Resources needed
    outputNodeId?: string; // Product/Resource generated
}

export interface ResourceData extends BaseNodeData {
    type: 'Resource';
    quantity: number;
    unitCost: number;
    category: 'material' | 'tool' | 'service';
}

export interface MarketData extends BaseNodeData {
    type: 'Market';
    demand: number; // 0-1
    competition: number; // 0-1
    trends: string[];
    targetProducts: string[]; // Product IDs that can be sold here
}

export interface IdeaData extends BaseNodeData {
    type: 'Idea';
    category: 'product' | 'feature' | 'improvement';
    requirements: string[]; // Required resources/skills
    potential: number; // 0-1, how promising the idea is
    discovered: boolean;
}

export interface EdgeData {
    id: string;
    source: string; // Source node ID
    target: string; // Target node ID
    label?: string; // e.g., "develops", "markets", "consumes"
    type?: 'assignment' | 'dependency' | 'creation_flow' | 'market_connection';
}

export interface CompanyFinances {
    capital: number;
    revenuePerTick: number;
    expensesPerTick: number;
    totalRevenue: number;
    totalExpenses: number;
}

// Game State in engine
export interface GameState {
    nodes: Array<BaseNodeData | PersonnelData | ProductData | TaskData | ResourceData | MarketData | IdeaData>;
    edges: EdgeData[];
    companyFinances: CompanyFinances;
    currentTick: number;
    availableIdeas: string[]; // IDs of IdeaNodes
    gameSpeed: number; // Multiplier for tick speed
    isPaused: boolean;
}

export interface ActionResult {
    success: boolean;
    message: string;
    data?: any;
}

// UI State types
export interface UIState {
    selectedNodeId: string | null;
    contextMenu: {
        visible: boolean;
        x: number;
        y: number;
        nodeId: string | null;
    };
    infoPanelData: BaseNodeData | null;
    notifications: Notification[];
}

export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    message: string;
    timestamp: number;
    duration?: number; // Auto-dismiss after this many ms
}

// Action types for game engine
export type GameActionType =
    | 'ADD_NODE'
    | 'REMOVE_NODE'
    | 'ADD_EDGE'
    | 'REMOVE_EDGE'
    | 'ASSIGN_PERSONNEL_TO_TASK'
    | 'UNASSIGN_PERSONNEL'
    | 'COMBINE_NODES'
    | 'DEVELOP_PRODUCT'
    | 'MARKET_PRODUCT'
    | 'HIRE_PERSONNEL'
    | 'FIRE_PERSONNEL'
    | 'PURCHASE_RESOURCE'
    | 'SELL_PRODUCT'
    | 'DISCOVER_IDEA'
    | 'CREATE_TASK'
    | 'COMPLETE_TASK'
    | 'PAUSE_GAME'
    | 'RESUME_GAME'
    | 'SET_GAME_SPEED';

export interface GameAction {
    type: GameActionType;
    payload: any;
}

// Event types for game engine
export type GameEventType = 
    | 'STATE_CHANGED'
    | 'NODE_ADDED'
    | 'NODE_REMOVED'
    | 'TASK_COMPLETED'
    | 'PRODUCT_DEVELOPED'
    | 'PERSONNEL_HIRED'
    | 'PERSONNEL_FIRED'
    | 'IDEA_DISCOVERED'
    | 'MARKET_CHANGE'
    | 'FINANCIAL_UPDATE';

export interface GameEvent {
    type: GameEventType;
    data: any;
    timestamp: number;
}
