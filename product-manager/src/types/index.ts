// Core type definitions for ProductGraphTycoon

export type NodeType = 'Personnel' | 'Product' | 'Resource' | 'Task' | 'Market' | 'Idea' | 'Course' | 'Population' | 'Lead' | 'Customer' | 'Content' | 'Campaign';

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
    actionPoints: number; // Current action points available
    maxActionPoints: number; // Maximum action points per cycle
    courseProgress?: {
        courseId: string;
        startTime: number; // Timestamp when course started for this personnel
        duration: number; // Total duration in seconds
        remainingTime: number; // Remaining time in seconds
    };
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

export interface CourseData extends BaseNodeData {
    type: 'Course';
    courseTemplateId: string; // Reference to CourseTemplate
    skillsImproved: string[];
    efficiencyBoost: number;
    duration: number; // Duration in seconds
    cost: number;
    category: 'technical' | 'design' | 'management' | 'business';
    maxParticipants: number;
    enrolledPersonnelIds: string[]; // Personnel currently taking the course
    personnelProgress: Record<string, {
        startTime: number; // When this specific personnel started the course
        remainingTime: number; // Remaining time for this personnel
    }>; // Track individual progress for each personnel
    isActive: boolean; // Whether the course is currently running
    isCompleted: boolean; // Whether the course has finished
}

// Marketing and Customer Relationship System
export interface PopulationData extends BaseNodeData {
    type: 'Population';
    totalSize: number; // Total addressable market size
    segments: PopulationSegment[];
    growthRate: number; // Population growth per tick (0-0.1)
    awareness: number; // Brand awareness level (0-1)
}

export interface PopulationSegment {
    id: string;
    name: string; // e.g., "Young Professionals", "Students", "Entrepreneurs"
    size: number; // Number of people in this segment
    interests: string[]; // What content they respond to
    conversionRate: number; // Base conversion rate from lead to customer (0-1)
    averageValue: number; // Average revenue per customer in this segment
    platforms: string[]; // Preferred social media platforms
}

export interface LeadData extends BaseNodeData {
    type: 'Lead';
    segmentId: string; // Which population segment they belong to
    source: string; // How they were generated (e.g., "instagram-post", "youtube-video")
    score: number; // Lead quality score (0-100)
    generatedAt: number; // Timestamp when lead was created
    conversionProbability: number; // Chance to convert to customer (0-1)
    interests: string[]; // What content/products they're interested in
    touchpoints: string[]; // History of interactions with content
}

export interface CustomerData extends BaseNodeData {
    type: 'Customer';
    segmentId: string; // Which population segment they belong to
    acquisitionSource: string; // Original lead source
    lifetimeValue: number; // Total revenue generated
    loyaltyLevel: number; // Customer loyalty (0-1)
    purchaseHistory: Purchase[];
    lastPurchaseAt: number; // Timestamp of last purchase
    churnRisk: number; // Risk of leaving (0-1)
}

export interface Purchase {
    productId: string;
    amount: number;
    timestamp: number;
    satisfaction: number; // 0-1
}

export interface ContentData extends BaseNodeData {
    type: 'Content';
    contentType: 'post' | 'video' | 'article' | 'story' | 'reel';
    platform: 'instagram' | 'facebook' | 'youtube' | 'linkedin' | 'tiktok';
    quality: number; // Content quality (0-1)
    targetSegments: string[]; // Which population segments this targets
    createdBy: string; // Personnel ID who created it
    createdAt: number; // Timestamp
    performance: ContentPerformance;
    cost: number; // Cost to create
}

export interface ContentPerformance {
    views: number;
    likes: number;
    shares: number;
    comments: number;
    leadsGenerated: number;
    engagementRate: number; // 0-1
    reach: number; // Number of unique people reached
}

export interface CampaignData extends BaseNodeData {
    type: 'Campaign';
    contentIds: string[]; // Content pieces used in this campaign
    targetSegments: string[]; // Population segments being targeted
    budget: number; // Money allocated to campaign
    spent: number; // Money already spent
    duration: number; // Campaign duration in ticks
    startedAt: number; // Timestamp when campaign started
    isActive: boolean;
    performance: CampaignPerformance;
}

export interface CampaignPerformance {
    totalReach: number;
    totalLeads: number;
    totalConversions: number;
    costPerLead: number;
    conversionRate: number;
    roi: number; // Return on investment
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
    nodes: Array<BaseNodeData | PersonnelData | ProductData | TaskData | ResourceData | MarketData | IdeaData | CourseData | PopulationData | LeadData | CustomerData | ContentData | CampaignData>;
    edges: EdgeData[];
    companyFinances: CompanyFinances;
    marketingMetrics: MarketingMetrics;
    currentTick: number; // Current week number (each tick = 1 week = 120 seconds)
    currentWeekStartTime: number; // Timestamp when current week started
    availableIdeas: string[]; // IDs of IdeaNodes
    gameSpeed: number; // Multiplier for tick speed
    isPaused: boolean;
}

export interface MarketingMetrics {
    totalLeads: number;
    totalCustomers: number;
    totalRevenue: number;
    averageCustomerValue: number;
    conversionRate: number; // Leads to customers
    brandAwareness: number; // 0-1
    contentCreated: number;
    activeCampaigns: number;
    monthlyActiveCustomers: number;
    customerChurnRate: number; // 0-1
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
    | 'UPDATE_FINANCES'
    | 'PAUSE_GAME'
    | 'RESUME_GAME'
    | 'SET_GAME_SPEED'
    | 'CONSUME_ACTION_POINTS'
    | 'ENROLL_PERSONNEL_IN_COURSE'
    | 'REMOVE_PERSONNEL_FROM_COURSE'
    | 'START_COURSE'
    | 'COMPLETE_COURSE'
    | 'CREATE_CONTENT'
    | 'CREATE_CAMPAIGN'
    | 'START_CAMPAIGN'
    | 'STOP_CAMPAIGN'
    | 'GENERATE_LEADS'
    | 'CONVERT_LEAD'
    | 'UPDATE_CUSTOMER'
    | 'PROCESS_CONTENT_PERFORMANCE'
    | 'UPDATE_MARKETING_METRICS';

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
