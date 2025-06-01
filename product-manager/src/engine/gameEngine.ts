import type {
    GameState,
    GameAction,
    ActionResult,
    BaseNodeData,
    EdgeData,
    PersonnelData,
    TaskData,
    ResourceData,
    IdeaData,
    CourseData,
    PopulationData,
    LeadData,
    CustomerData,
    ContentData,
    CampaignData,
    AngelFounderData,
    PitchData,
    MarketingMetrics,
    PopulationSegment,
    GameEvent,
    GameEventType
} from '../types';
import { populationSegments } from '../data/populationSegments';

// Simple event emitter for game state changes
class EventEmitter {
    private listeners: Map<string, Function[]> = new Map();

    on(event: string, callback: Function) {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(callback);
    }

    emit(event: string, data?: any) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            callbacks.forEach(callback => callback(data));
        }
    }

    off(event: string, callback: Function) {
        const callbacks = this.listeners.get(event);
        if (callbacks) {
            const index = callbacks.indexOf(callback);
            if (index > -1) {
                callbacks.splice(index, 1);
            }
        }
    }
}

export class GameEngine extends EventEmitter {
    private gameState: GameState;
    private tickInterval: NodeJS.Timeout | null = null;
    private courseProcessingInterval: NodeJS.Timeout | null = null;
    private pausedAt: number | null = null;

    constructor() {
        super();
        this.gameState = this.initializeGameState();
        this.startGameLoop(); // Start the game loop immediately
    }

    private initializeGameState(): GameState {
        // Create initial game state with some starting nodes
        const initialNodes: BaseNodeData[] = [
            {
                id: 'founder-1',
                label: 'Founder',
                type: 'Personnel',
                description: 'Company founder with entrepreneurial skills',
                skills: ['leadership', 'vision', 'networking', 'pitching'],
                efficiency: 0.8,
                morale: 0.9,
                salary: 0, // Founder doesn't take salary initially
                actionPoints: 3,
                maxActionPoints: 3,
                position: { x: 100, y: 100 }
            } as PersonnelData,
            {
                id: 'idea-1',
                label: 'Mobile App Idea',
                type: 'Idea',
                description: 'An idea for a productivity mobile app',
                category: 'product',
                requirements: ['mobile development', 'ui design'],
                potential: 0.7,
                discovered: true,
                position: { x: 300, y: 100 }
            } as IdeaData,
            {
                id: 'resource-1',
                label: 'Initial Capital',
                type: 'Resource',
                description: 'Starting money for the company',
                quantity: 50000,
                unitCost: 1,
                category: 'service',
                position: { x: 200, y: 200 }
            } as ResourceData,
            {
                id: 'population-1',
                label: 'Target Market',
                type: 'Population',
                description: 'Your potential customer base',
                totalSize: populationSegments.reduce((sum, segment) => sum + segment.size, 0),
                segments: [...populationSegments],
                growthRate: 0.02, // 2% growth per tick
                awareness: 0.01, // Very low initial brand awareness
                position: { x: 400, y: 200 }
            } as PopulationData
        ];

        return {
            nodes: initialNodes,
            edges: [],
            companyFinances: {
                capital: 50000,
                revenuePerTick: 0,
                expensesPerTick: 0,
                totalRevenue: 0,
                totalExpenses: 0
            },
            marketingMetrics: {
                totalLeads: 0,
                totalCustomers: 0,
                totalRevenue: 0,
                averageCustomerValue: 0,
                conversionRate: 0,
                brandAwareness: 0.01,
                contentCreated: 0,
                activeCampaigns: 0,
                monthlyActiveCustomers: 0,
                customerChurnRate: 0
            },
            currentTick: 0,
            currentWeekStartTime: Date.now(),
            availableIdeas: ['idea-1'],
            gameSpeed: 1,
            isPaused: false
        };
    }

    // Public API methods
    getState(): GameState {
        // Return a deep copy to prevent external mutations
        return JSON.parse(JSON.stringify(this.gameState));
    }

    performAction(action: GameAction): ActionResult {
        try {
            switch (action.type) {
                case 'ADD_NODE':
                    return this.addNode(action.payload);
                case 'REMOVE_NODE':
                    return this.removeNode(action.payload.nodeId);
                case 'ADD_EDGE':
                    return this.addEdge(action.payload);
                case 'REMOVE_EDGE':
                    return this.removeEdge(action.payload.edgeId);
                case 'ASSIGN_PERSONNEL_TO_TASK':
                    return this.assignPersonnelToTask(action.payload.personnelId, action.payload.taskId);
                case 'UNASSIGN_PERSONNEL_FROM_TASK':
                    return this.unassignPersonnelFromTask(action.payload.personnelId, action.payload.taskId);
                case 'PAUSE_GAME':
                    return this.pauseGame();
                case 'RESUME_GAME':
                    return this.resumeGame();
                case 'SET_GAME_SPEED':
                    return this.setGameSpeed(action.payload.speed);
                case 'HIRE_PERSONNEL':
                    return this.hirePersonnel(action.payload);
                case 'FIRE_PERSONNEL':
                    return this.firePersonnel(action.payload.personnelId);
                case 'CREATE_TASK':
                    return this.createTask(action.payload);
                case 'UPDATE_FINANCES':
                    return this.updateFinancesAction(action.payload);
                case 'CONSUME_ACTION_POINTS':
                    return this.consumeActionPoints(action.payload.personnelId, action.payload.amount || 1);
                case 'ENROLL_PERSONNEL_IN_COURSE':
                    return this.enrollPersonnelInCourse(action.payload.personnelId, action.payload.courseId);
                case 'REMOVE_PERSONNEL_FROM_COURSE':
                    return this.removePersonnelFromCourse(action.payload.personnelId, action.payload.courseId);
                case 'START_COURSE':
                    return this.startCourse(action.payload.courseId);
                case 'COMPLETE_COURSE':
                    return this.completeCourse(action.payload.courseId);
                case 'CREATE_CONTENT':
                    return this.createContent(action.payload);
                case 'CREATE_CAMPAIGN':
                    return this.createCampaign(action.payload);
                case 'START_CAMPAIGN':
                    return this.startCampaign(action.payload.campaignId);
                case 'STOP_CAMPAIGN':
                    return this.stopCampaign(action.payload.campaignId);
                case 'GENERATE_LEADS':
                    return this.generateLeads(action.payload);
                case 'CONVERT_LEAD':
                    return this.convertLead(action.payload.leadId);
                case 'UPDATE_CUSTOMER':
                    return this.updateCustomer(action.payload);
                case 'PROCESS_CONTENT_PERFORMANCE':
                    return this.processContentPerformance(action.payload.contentId);
                case 'UPDATE_MARKETING_METRICS':
                    return this.updateMarketingMetrics();
                case 'CREATE_PITCH':
                    return this.createPitch(action.payload);
                case 'PRESENT_PITCH':
                    return this.presentPitch(action.payload);
                case 'SECURE_ANGEL_FUNDING':
                    return this.secureAngelFunding(action.payload);
                default:
                    return { success: false, message: `Unknown action type: ${action.type}` };
            }
        } catch (error) {
            return { success: false, message: `Action failed: ${error}` };
        }
    }

    // Node management
    addNode(nodeData: BaseNodeData): ActionResult {
        // Validate node data
        if (!nodeData.id || !nodeData.label || !nodeData.type) {
            return { success: false, message: 'Invalid node data: missing required fields' };
        }

        // Check if node already exists
        if (this.gameState.nodes.find(node => node.id === nodeData.id)) {
            return { success: false, message: `Node with id ${nodeData.id} already exists` };
        }

        this.gameState.nodes.push(nodeData);
        this.emitStateChange('NODE_ADDED', nodeData);
        return { success: true, message: 'Node added successfully', data: nodeData };
    }

    removeNode(nodeId: string): ActionResult {
        const nodeIndex = this.gameState.nodes.findIndex(node => node.id === nodeId);
        if (nodeIndex === -1) {
            return { success: false, message: `Node with id ${nodeId} not found` };
        }

        const removedNode = this.gameState.nodes[nodeIndex];
        this.gameState.nodes.splice(nodeIndex, 1);

        // Remove all edges connected to this node
        this.gameState.edges = this.gameState.edges.filter(
            edge => edge.source !== nodeId && edge.target !== nodeId
        );

        this.emitStateChange('NODE_REMOVED', removedNode);
        return { success: true, message: 'Node removed successfully', data: removedNode };
    }

    // Edge management
    addEdge(edgeData: EdgeData): ActionResult {
        // Validate edge data
        if (!edgeData.id || !edgeData.source || !edgeData.target) {
            return { success: false, message: 'Invalid edge data: missing required fields' };
        }

        // Check if edge already exists
        if (this.gameState.edges.find(edge => edge.id === edgeData.id)) {
            return { success: false, message: `Edge with id ${edgeData.id} already exists` };
        }

        // Validate that source and target nodes exist
        const sourceExists = this.gameState.nodes.find(node => node.id === edgeData.source);
        const targetExists = this.gameState.nodes.find(node => node.id === edgeData.target);

        if (!sourceExists || !targetExists) {
            return { success: false, message: 'Source or target node does not exist' };
        }

        this.gameState.edges.push(edgeData);
        this.emitStateChange('STATE_CHANGED', this.gameState);
        return { success: true, message: 'Edge added successfully', data: edgeData };
    }

    removeEdge(edgeId: string): ActionResult {
        const edgeIndex = this.gameState.edges.findIndex(edge => edge.id === edgeId);
        if (edgeIndex === -1) {
            return { success: false, message: `Edge with id ${edgeId} not found` };
        }

        const removedEdge = this.gameState.edges[edgeIndex];
        this.gameState.edges.splice(edgeIndex, 1);

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return { success: true, message: 'Edge removed successfully', data: removedEdge };
    }

    // Game mechanics
    assignPersonnelToTask(personnelId: string, taskId: string): ActionResult {
        const personnel = this.gameState.nodes.find(node => node.id === personnelId && node.type === 'Personnel') as PersonnelData;
        const task = this.gameState.nodes.find(node => node.id === taskId && node.type === 'Task') as TaskData;

        if (!personnel) {
            return { success: false, message: 'Personnel not found' };
        }

        if (!task) {
            return { success: false, message: 'Task not found' };
        }

        // Check if personnel is already assigned
        if (personnel.assignedToTaskId) {
            return { success: false, message: 'Personnel is already assigned to a task' };
        }

        // Check if personnel has required skills
        const hasRequiredSkills = task.requiredSkills.some(skill =>
            personnel.skills.includes(skill)
        );

        if (!hasRequiredSkills) {
            return {
                success: false,
                message: `Personnel lacks required skills. Task requires: ${task.requiredSkills.join(', ')}. Personnel has: ${personnel.skills.join(', ')}`
            };
        }

        // Assign personnel to task
        personnel.assignedToTaskId = taskId;
        if (!task.assignedPersonnelIds.includes(personnelId)) {
            task.assignedPersonnelIds.push(personnelId);
        }

        // Initialize task timing if this is the first personnel assigned
        if (task.assignedPersonnelIds.length === 1 && !task.startTime) {
            const currentTime = Date.now();
            task.startTime = currentTime;
            // Calculate total duration in seconds: timeToComplete ticks * 120 seconds per tick
            const totalDurationSeconds = task.timeToComplete * 120;
            task.remainingTime = totalDurationSeconds;
        }

        // Set the personnel's assigned task for compound node functionality
        (personnel as any).assignedToTask = taskId;

        // Position personnel inside the task node
        const taskPosition = task.position || { x: 200, y: 200 };
        const assignedCount = task.assignedPersonnelIds.length;
        const angle = (assignedCount - 1) * (Math.PI * 2 / Math.max(task.assignedPersonnelIds.length, 4));
        const radius = 30; // Distance from task center

        personnel.position = {
            x: taskPosition.x + Math.cos(angle) * radius,
            y: taskPosition.y + Math.sin(angle) * radius
        };

        this.emitStateChange('STATE_CHANGED', this.gameState);

        return { success: true, message: 'Personnel assigned to task successfully' };
    }

    unassignPersonnelFromTask(personnelId: string, taskId: string): ActionResult {
        const personnel = this.gameState.nodes.find(node => node.id === personnelId && node.type === 'Personnel') as PersonnelData;
        const task = this.gameState.nodes.find(node => node.id === taskId && node.type === 'Task') as TaskData;

        if (!personnel) {
            return { success: false, message: 'Personnel not found' };
        }

        if (!task) {
            return { success: false, message: 'Task not found' };
        }

        const assignmentIndex = task.assignedPersonnelIds.indexOf(personnelId);
        if (assignmentIndex === -1) {
            return { success: false, message: 'Personnel is not assigned to this task' };
        }

        // Remove personnel from task
        task.assignedPersonnelIds.splice(assignmentIndex, 1);

        // Clear personnel assignment tracking
        delete personnel.assignedToTaskId;
        delete (personnel as any).assignedToTask;

        // Move personnel outside the task
        const taskPosition = task.position || { x: 200, y: 200 };
        personnel.position = {
            x: taskPosition.x + 100 + Math.random() * 100,
            y: taskPosition.y + 100 + Math.random() * 100
        };

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return {
            success: true,
            message: `${personnel.label} unassigned from ${task.label}`,
            data: { personnelId, taskId }
        };
    }

    // Personnel management
    hirePersonnel(personnelTemplate: any): ActionResult {
        // Check if company has enough capital
        const hiringCost = personnelTemplate.salary * 5; // 5 ticks worth of salary as hiring cost
        if (this.gameState.companyFinances.capital < hiringCost) {
            return { success: false, message: `Not enough capital to hire. Need ${hiringCost}, have ${this.gameState.companyFinances.capital}` };
        }

        // Create new personnel node
        const newPersonnel: PersonnelData = {
            id: `personnel-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            label: personnelTemplate.label || 'New Employee',
            type: 'Personnel',
            description: personnelTemplate.description || 'A newly hired employee',
            skills: [...(personnelTemplate.skills || ['general'])],
            efficiency: personnelTemplate.efficiency || 0.7,
            morale: personnelTemplate.morale || 0.8,
            salary: personnelTemplate.salary || 1000,
            actionPoints: 3, // Start with full action points
            maxActionPoints: 3, // Default max action points
            position: personnelTemplate.position || {
                x: Math.random() * 400 + 100,
                y: Math.random() * 400 + 100
            }
        };

        // Deduct hiring cost
        this.gameState.companyFinances.capital -= hiringCost;

        // Add personnel to game state
        this.gameState.nodes.push(newPersonnel);
        this.emitStateChange('NODE_ADDED', newPersonnel);

        return {
            success: true,
            message: `Hired ${newPersonnel.label} for ${hiringCost} capital`,
            data: newPersonnel
        };
    }

    firePersonnel(personnelId: string): ActionResult {
        const personnel = this.gameState.nodes.find(node => node.id === personnelId && node.type === 'Personnel') as PersonnelData;

        if (!personnel) {
            return { success: false, message: 'Personnel not found' };
        }

        // Unassign from any tasks
        if (personnel.assignedToTaskId) {
            const task = this.gameState.nodes.find(node => node.id === personnel.assignedToTaskId && node.type === 'Task') as TaskData;
            if (task) {
                task.assignedPersonnelIds = task.assignedPersonnelIds.filter(id => id !== personnelId);
            }

            // Clear the personnel's assigned task for compound node functionality
            delete (personnel as any).assignedToTask;
        }

        // Remove personnel node
        return this.removeNode(personnelId);
    }

    // Task management
    createTask(taskData: any): ActionResult {
        // Validate required fields
        if (!taskData.label || !taskData.requiredSkills || !taskData.timeToComplete) {
            return { success: false, message: 'Invalid task data: missing required fields' };
        }

        // Create new task node
        const newTask: TaskData = {
            id: `task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            label: taskData.label,
            type: 'Task',
            description: taskData.description || 'A new task to be completed',
            requiredSkills: [...taskData.requiredSkills],
            timeToComplete: taskData.timeToComplete,
            progress: 0,
            assignedPersonnelIds: [],
            inputNodeIds: taskData.inputNodeIds || [],
            outputNodeId: taskData.outputNodeId,
            position: taskData.position || {
                x: Math.random() * 400 + 100,
                y: Math.random() * 400 + 100
            }
        };

        // Add task to game state
        this.gameState.nodes.push(newTask);
        this.emitStateChange('NODE_ADDED', newTask);

        return {
            success: true,
            message: `Created task: ${newTask.label}`,
            data: newTask
        };
    }

    // Finance management
    updateFinancesAction(payload: { capitalChange?: number; revenueChange?: number; expenseChange?: number }): ActionResult {
        if (payload.capitalChange !== undefined) {
            this.gameState.companyFinances.capital += payload.capitalChange;
        }

        if (payload.revenueChange !== undefined) {
            this.gameState.companyFinances.revenuePerTick += payload.revenueChange;
        }

        if (payload.expenseChange !== undefined) {
            this.gameState.companyFinances.expensesPerTick += payload.expenseChange;
        }

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return { success: true, message: 'Finances updated successfully' };
    }

    // Game control
    pauseGame(): ActionResult {
        console.log('PAUSE: Before pause - nodes count:', this.gameState.nodes.length);
        console.log('PAUSE: Courses before:', this.gameState.nodes.filter(n => n.type === 'Course').map(c => ({ id: c.id, label: c.label })));
        console.log('PAUSE: Personnel before:', this.gameState.nodes.filter(n => n.type === 'Personnel').map(p => ({ id: p.id, label: p.label, enrolledInCourse: (p as any).enrolledInCourse })));

        this.gameState.isPaused = true;
        this.pausedAt = Date.now(); // Store when we paused

        // Pause course progress for all personnel
        this.gameState.nodes.forEach(node => {
            if (node.type === 'Personnel') {
                const personnel = node as PersonnelData;
                if (personnel.courseProgress) {
                    // Update remaining time before pausing (accounting for game speed)
                    const realElapsedTime = (Date.now() - personnel.courseProgress.startTime) / 1000;
                    const gameSpeedElapsedTime = realElapsedTime * this.gameState.gameSpeed;
                    personnel.courseProgress.remainingTime = Math.max(0, personnel.courseProgress.duration - gameSpeedElapsedTime);

                    // Ensure the enrolledInCourse property is preserved during pause
                    (personnel as any).enrolledInCourse = personnel.courseProgress.courseId;
                    console.log('PAUSE: Set enrolledInCourse for', personnel.id, 'to', personnel.courseProgress.courseId);
                }
            } else if (node.type === 'Task') {
                const task = node as TaskData;
                if (task.assignedPersonnelIds.length > 0 && task.startTime) {
                    // Update remainingTime based on current progress for display purposes
                    const totalDurationSeconds = task.timeToComplete * 120;
                    task.remainingTime = Math.max(0, totalDurationSeconds * (1 - task.progress));
                }
            }
        });

        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        if (this.courseProcessingInterval) {
            clearInterval(this.courseProcessingInterval);
            this.courseProcessingInterval = null;
        }

        console.log('PAUSE: After pause - nodes count:', this.gameState.nodes.length);
        console.log('PAUSE: Courses after:', this.gameState.nodes.filter(n => n.type === 'Course').map(c => ({ id: c.id, label: c.label })));
        console.log('PAUSE: Personnel after:', this.gameState.nodes.filter(n => n.type === 'Personnel').map(p => ({ id: p.id, label: p.label, enrolledInCourse: (p as any).enrolledInCourse })));

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return { success: true, message: 'Game paused' };
    }

    resumeGame(): ActionResult {
        console.log('RESUME: Before resume - nodes count:', this.gameState.nodes.length);
        console.log('RESUME: Courses before:', this.gameState.nodes.filter(n => n.type === 'Course').map(c => ({ id: c.id, label: c.label })));
        console.log('RESUME: Personnel before:', this.gameState.nodes.filter(n => n.type === 'Personnel').map(p => ({ id: p.id, label: p.label, enrolledInCourse: (p as any).enrolledInCourse })));

        this.gameState.isPaused = false;

        // Adjust week start time to account for pause duration
        if (this.pausedAt && this.gameState.currentWeekStartTime) {
            const pauseDuration = Date.now() - this.pausedAt;
            this.gameState.currentWeekStartTime += pauseDuration;
        }

        // Resume course progress for all personnel
        const currentTime = Date.now();
        this.gameState.nodes.forEach(node => {
            if (node.type === 'Personnel') {
                const personnel = node as PersonnelData;
                if (personnel.courseProgress) {
                    // Reset start time to current time, keeping remaining duration
                    personnel.courseProgress.startTime = currentTime;
                    personnel.courseProgress.duration = personnel.courseProgress.remainingTime;

                    // Ensure the enrolledInCourse property is set for compound node functionality
                    (personnel as any).enrolledInCourse = personnel.courseProgress.courseId;
                    console.log('RESUME: Set enrolledInCourse for', personnel.id, 'to', personnel.courseProgress.courseId);

                    // Update course progress tracking
                    const course = this.gameState.nodes.find(n => n.id === personnel.courseProgress!.courseId) as CourseData;
                    if (course && course.personnelProgress[personnel.id]) {
                        course.personnelProgress[personnel.id].startTime = currentTime;
                        course.personnelProgress[personnel.id].remainingTime = personnel.courseProgress.remainingTime;
                    }
                }
            } else if (node.type === 'Task') {
                const task = node as TaskData;
                if (task.assignedPersonnelIds.length > 0 && task.startTime && task.remainingTime) {
                    // Reset start time to current time, keeping remaining duration
                    task.startTime = currentTime;
                }
            }
        });

        this.startGameLoop();

        console.log('RESUME: After resume - nodes count:', this.gameState.nodes.length);
        console.log('RESUME: Courses after:', this.gameState.nodes.filter(n => n.type === 'Course').map(c => ({ id: c.id, label: c.label })));
        console.log('RESUME: Personnel after:', this.gameState.nodes.filter(n => n.type === 'Personnel').map(p => ({ id: p.id, label: p.label, enrolledInCourse: (p as any).enrolledInCourse })));

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return { success: true, message: 'Game resumed' };
    }

    setGameSpeed(speed: number): ActionResult {
        if (speed < 0.1 || speed > 5) {
            return { success: false, message: 'Game speed must be between 0.1 and 5' };
        }

        const oldSpeed = this.gameState.gameSpeed;
        this.gameState.gameSpeed = speed;

        // Adjust the current week start time to maintain progress continuity
        if (this.gameState.currentWeekStartTime) {
            const now = Date.now();
            const elapsedTime = now - this.gameState.currentWeekStartTime;
            const oldWeekDuration = (120 * 1000) / oldSpeed;
            const newWeekDuration = (120 * 1000) / speed;

            // Calculate how much progress we've made in the old speed
            const progressRatio = elapsedTime / oldWeekDuration;

            // Adjust start time so the same progress ratio applies to new speed
            const newElapsedTime = progressRatio * newWeekDuration;
            this.gameState.currentWeekStartTime = now - newElapsedTime;
        }

        // Update course progress for speed change
        const currentTime = Date.now();
        this.gameState.nodes.forEach(node => {
            if (node.type === 'Personnel') {
                const personnel = node as PersonnelData;
                if (personnel.courseProgress) {
                    // Calculate current progress with old speed
                    const realElapsedTime = (currentTime - personnel.courseProgress.startTime) / 1000;
                    const oldSpeedElapsedTime = realElapsedTime * oldSpeed;
                    const remainingTime = Math.max(0, personnel.courseProgress.duration - oldSpeedElapsedTime);

                    // Reset with new speed
                    personnel.courseProgress.startTime = currentTime;
                    personnel.courseProgress.duration = remainingTime;
                    personnel.courseProgress.remainingTime = remainingTime;

                    // Update course progress tracking
                    const course = this.gameState.nodes.find(n => n.id === personnel.courseProgress!.courseId) as CourseData;
                    if (course && course.personnelProgress[personnel.id]) {
                        course.personnelProgress[personnel.id].startTime = currentTime;
                        course.personnelProgress[personnel.id].remainingTime = remainingTime;
                    }
                }
            } else if (node.type === 'Task') {
                const task = node as TaskData;
                if (task.assignedPersonnelIds.length > 0 && task.startTime) {
                    // For tasks, we don't need to adjust timing because the progress is managed
                    // by the processTasksRealTime() method which uses task.progress as the source of truth.
                    // The progress calculation already accounts for the current game speed.
                    // We just need to reset the startTime to maintain consistency for any timing displays.
                    task.startTime = currentTime;

                    // Update remainingTime based on current progress for display purposes
                    const totalDurationSeconds = task.timeToComplete * 120;
                    task.remainingTime = Math.max(0, totalDurationSeconds * (1 - task.progress));
                }
            }
        });

        // Restart game loop with new speed if not paused
        if (!this.gameState.isPaused) {
            this.startGameLoop();
        }

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return { success: true, message: `Game speed set to ${speed}x` };
    }

    // Game loop
    startGameLoop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
        }
        if (this.courseProcessingInterval) {
            clearInterval(this.courseProcessingInterval);
        }

        if (!this.gameState.isPaused) {
            const tickDuration = (120 * 1000) / this.gameState.gameSpeed; // Base tick is 120 seconds (1 week)
            this.tickInterval = setInterval(() => {
                this.tick();
            }, tickDuration);

            // Start real-time course and task processing (every 1 second)
            this.courseProcessingInterval = setInterval(() => {
                this.processCourses();
                this.processTasksRealTime();
                this.emitStateChange('STATE_CHANGED', this.gameState);
            }, 1000);
        }
    }

    stopGameLoop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        if (this.courseProcessingInterval) {
            clearInterval(this.courseProcessingInterval);
            this.courseProcessingInterval = null;
        }
    }

    // Public tick method that can be called externally
    tick() {
        if (this.gameState.isPaused) return;

        this.gameState.currentTick++;
        this.gameState.currentWeekStartTime = Date.now(); // Reset week start time

        // Each tick represents 1 week, so restore action points every tick
        this.restoreActionPoints();

        // Process ongoing tasks
        this.processTasks();

        // Process ongoing courses
        this.processCourses();

        // Update finances
        this.updateFinances();

        // Emit state change
        this.emitStateChange('STATE_CHANGED', this.gameState);
    }

    private restoreActionPoints() {
        // Restore action points for all personnel at the start of each cycle
        this.gameState.nodes.forEach(node => {
            if (node.type === 'Personnel') {
                const personnel = node as PersonnelData;
                personnel.actionPoints = personnel.maxActionPoints;
            }
        });
    }

    consumeActionPoints(personnelId: string, amount: number = 1): ActionResult {
        const personnel = this.gameState.nodes.find(node =>
            node.id === personnelId && node.type === 'Personnel'
        ) as PersonnelData;

        if (!personnel) {
            return { success: false, message: `Personnel with id ${personnelId} not found` };
        }

        if (personnel.actionPoints < amount) {
            return { success: false, message: `Not enough action points. Has ${personnel.actionPoints}, needs ${amount}` };
        }

        personnel.actionPoints -= amount;
        this.emitStateChange('STATE_CHANGED', this.gameState);

        return {
            success: true,
            message: `Consumed ${amount} action point(s). ${personnel.actionPoints} remaining.`,
            data: { personnelId, remainingActionPoints: personnel.actionPoints }
        };
    }

    // Course management methods
    enrollPersonnelInCourse(personnelId: string, courseId: string): ActionResult {
        const personnel = this.gameState.nodes.find(node =>
            node.id === personnelId && node.type === 'Personnel'
        ) as PersonnelData;

        const course = this.gameState.nodes.find(node =>
            node.id === courseId && node.type === 'Course'
        ) as CourseData;

        if (!personnel) {
            return { success: false, message: `Personnel with id ${personnelId} not found` };
        }

        if (!course) {
            return { success: false, message: `Course with id ${courseId} not found` };
        }

        if (course.isCompleted) {
            return { success: false, message: 'Course has already been completed' };
        }

        if (course.enrolledPersonnelIds.includes(personnelId)) {
            return { success: false, message: 'Personnel is already enrolled in this course' };
        }

        if (course.enrolledPersonnelIds.length >= course.maxParticipants) {
            return { success: false, message: 'Course is at maximum capacity' };
        }

        // Check if personnel is already in another course
        if (personnel.courseProgress) {
            return { success: false, message: 'Personnel is already enrolled in another course' };
        }

        // Enroll personnel
        course.enrolledPersonnelIds.push(personnelId);

        // Initialize individual progress tracking
        const currentTime = Date.now();
        course.personnelProgress[personnelId] = {
            startTime: currentTime,
            remainingTime: course.duration
        };

        // Set personnel course progress
        personnel.courseProgress = {
            courseId: courseId,
            startTime: currentTime,
            duration: course.duration,
            remainingTime: course.duration
        };

        // Set the personnel's enrolled course for compound node functionality
        (personnel as any).enrolledInCourse = courseId;

        // Position personnel inside the course node
        const coursePosition = course.position || { x: 200, y: 200 };
        const enrolledCount = course.enrolledPersonnelIds.length;
        const angle = (enrolledCount - 1) * (Math.PI * 2 / Math.max(course.maxParticipants, 4));
        const radius = 30; // Distance from course center

        personnel.position = {
            x: coursePosition.x + Math.cos(angle) * radius,
            y: coursePosition.y + Math.sin(angle) * radius
        };

        // Start course if this is the first enrollment
        if (course.enrolledPersonnelIds.length === 1 && !course.isActive) {
            course.isActive = true;
        }

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return {
            success: true,
            message: `${personnel.label} enrolled in ${course.label}`,
            data: { personnelId, courseId }
        };
    }

    removePersonnelFromCourse(personnelId: string, courseId: string): ActionResult {
        const personnel = this.gameState.nodes.find(node =>
            node.id === personnelId && node.type === 'Personnel'
        ) as PersonnelData;

        const course = this.gameState.nodes.find(node =>
            node.id === courseId && node.type === 'Course'
        ) as CourseData;

        if (!personnel) {
            return { success: false, message: `Personnel with id ${personnelId} not found` };
        }

        if (!course) {
            return { success: false, message: `Course with id ${courseId} not found` };
        }

        const enrollmentIndex = course.enrolledPersonnelIds.indexOf(personnelId);
        if (enrollmentIndex === -1) {
            return { success: false, message: 'Personnel is not enrolled in this course' };
        }

        // Remove personnel from course
        course.enrolledPersonnelIds.splice(enrollmentIndex, 1);

        // Clear personnel progress tracking
        delete course.personnelProgress[personnelId];
        delete personnel.courseProgress;

        // Clear the personnel's enrolled course for compound node functionality
        delete (personnel as any).enrolledInCourse;

        // Move personnel outside the course
        const coursePosition = course.position || { x: 200, y: 200 };
        personnel.position = {
            x: coursePosition.x + 100 + Math.random() * 100,
            y: coursePosition.y + 100 + Math.random() * 100
        };

        // Stop course if no one is enrolled
        if (course.enrolledPersonnelIds.length === 0 && course.isActive && !course.isCompleted) {
            course.isActive = false;
        }

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return {
            success: true,
            message: `${personnel.label} removed from ${course.label} (progress reset)`,
            data: { personnelId, courseId }
        };
    }

    startCourse(courseId: string): ActionResult {
        const course = this.gameState.nodes.find(node =>
            node.id === courseId && node.type === 'Course'
        ) as CourseData;

        if (!course) {
            return { success: false, message: `Course with id ${courseId} not found` };
        }

        if (course.isCompleted) {
            return { success: false, message: 'Course has already been completed' };
        }

        if (course.isActive) {
            return { success: false, message: 'Course is already active' };
        }

        if (course.enrolledPersonnelIds.length === 0) {
            return { success: false, message: 'Cannot start course with no enrolled personnel' };
        }

        course.isActive = true;

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return {
            success: true,
            message: `${course.label} course started`,
            data: { courseId }
        };
    }

    completePersonnelCourse(personnelId: string): ActionResult {
        const personnel = this.gameState.nodes.find(node =>
            node.id === personnelId && node.type === 'Personnel'
        ) as PersonnelData;

        if (!personnel || !personnel.courseProgress) {
            return { success: false, message: 'Personnel not found or not enrolled in a course' };
        }

        const course = this.gameState.nodes.find(node =>
            node.id === personnel.courseProgress!.courseId && node.type === 'Course'
        ) as CourseData;

        if (!course) {
            return { success: false, message: 'Course not found' };
        }

        // Apply skill improvements and efficiency boosts
        course.skillsImproved.forEach(skill => {
            if (!personnel.skills.includes(skill)) {
                personnel.skills.push(skill);
            }
        });

        // Boost efficiency (cap at 1.0)
        personnel.efficiency = Math.min(1.0, personnel.efficiency + course.efficiencyBoost);

        // Remove personnel from course
        const enrollmentIndex = course.enrolledPersonnelIds.indexOf(personnelId);
        if (enrollmentIndex !== -1) {
            course.enrolledPersonnelIds.splice(enrollmentIndex, 1);
        }

        // Clear progress tracking
        delete course.personnelProgress[personnelId];
        delete personnel.courseProgress;
        delete (personnel as any).enrolledInCourse;

        // Move personnel outside the course
        const coursePosition = course.position || { x: 200, y: 200 };
        personnel.position = {
            x: coursePosition.x + 100 + Math.random() * 100,
            y: coursePosition.y + 100 + Math.random() * 100
        };

        // Stop course if no one is enrolled
        if (course.enrolledPersonnelIds.length === 0 && course.isActive) {
            course.isActive = false;
        }

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return {
            success: true,
            message: `${personnel.label} completed ${course.label}!`,
            data: { personnelId, courseId: course.id }
        };
    }

    completeCourse(courseId: string): ActionResult {
        // This method is kept for compatibility but now completes all remaining personnel
        const course = this.gameState.nodes.find(node =>
            node.id === courseId && node.type === 'Course'
        ) as CourseData;

        if (!course) {
            return { success: false, message: `Course with id ${courseId} not found` };
        }

        const improvedPersonnel: string[] = [];

        // Complete course for all enrolled personnel
        [...course.enrolledPersonnelIds].forEach(personnelId => {
            const result = this.completePersonnelCourse(personnelId);
            if (result.success) {
                const personnel = this.gameState.nodes.find(node => node.id === personnelId) as PersonnelData;
                if (personnel) {
                    improvedPersonnel.push(personnel.label);
                }
            }
        });

        // Mark course as completed
        course.isCompleted = true;
        course.isActive = false;

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return {
            success: true,
            message: `${course.label} completed! Improved: ${improvedPersonnel.join(', ')}`,
            data: { courseId, improvedPersonnel }
        };
    }

    private processTasks() {
        const tasks = this.gameState.nodes.filter(node => node.type === 'Task') as TaskData[];

        tasks.forEach(task => {
            if (task.assignedPersonnelIds.length > 0 && task.progress < 1) {
                // Calculate progress based on assigned personnel efficiency
                let totalEfficiency = 0;
                task.assignedPersonnelIds.forEach(personnelId => {
                    const personnel = this.gameState.nodes.find(node => node.id === personnelId) as PersonnelData;
                    if (personnel) {
                        totalEfficiency += personnel.efficiency;
                    }
                });

                // Progress increases based on total efficiency and time
                const progressIncrease = (totalEfficiency / task.timeToComplete) * 0.1; // 0.1 per tick base rate
                task.progress = Math.min(1, task.progress + progressIncrease);

                // Check if task is completed
                if (task.progress >= 1) {
                    this.completeTask(task);
                }
            }
        });
    }

    private processTasksRealTime() {
        const tasks = this.gameState.nodes.filter(node => node.type === 'Task') as TaskData[];

        tasks.forEach(task => {
            if (task.assignedPersonnelIds.length > 0 && task.progress < 1) {
                // Calculate progress based on assigned personnel efficiency
                let totalEfficiency = 0;
                task.assignedPersonnelIds.forEach(personnelId => {
                    const personnel = this.gameState.nodes.find(node => node.id === personnelId) as PersonnelData;
                    if (personnel) {
                        totalEfficiency += personnel.efficiency;
                    }
                });

                // Real-time progress: progress per second based on game speed
                // Base rate: complete in timeToComplete ticks (weeks)
                // Each tick = 120 seconds, so progress per second = efficiency / (timeToComplete * 120)
                const progressPerSecond = (totalEfficiency / (task.timeToComplete * 120)) * this.gameState.gameSpeed;
                task.progress = Math.min(1, task.progress + progressPerSecond);

                // Check if task is completed
                if (task.progress >= 1) {
                    this.completeTask(task);
                }
            }
        });
    }

    private processCourses() {
        const courses = this.gameState.nodes.filter(node => node.type === 'Course') as CourseData[];
        const currentTime = Date.now();

        courses.forEach(course => {
            if (course.isActive && !course.isCompleted) {
                // Check each enrolled personnel's progress
                const completedPersonnel: string[] = [];

                course.enrolledPersonnelIds.forEach(personnelId => {
                    const personnel = this.gameState.nodes.find(node =>
                        node.id === personnelId && node.type === 'Personnel'
                    ) as PersonnelData;

                    if (personnel && personnel.courseProgress) {
                        // Calculate elapsed time with game speed multiplier
                        const realElapsedTime = (currentTime - personnel.courseProgress.startTime) / 1000;
                        const gameSpeedElapsedTime = realElapsedTime * this.gameState.gameSpeed;
                        const remainingTime = Math.max(0, personnel.courseProgress.duration - gameSpeedElapsedTime);

                        // Update remaining time
                        personnel.courseProgress.remainingTime = remainingTime;
                        course.personnelProgress[personnelId].remainingTime = remainingTime;

                        // Check if personnel completed the course
                        if (remainingTime <= 0) {
                            completedPersonnel.push(personnelId);
                        }
                    }
                });

                // Complete courses for personnel who finished
                completedPersonnel.forEach(personnelId => {
                    this.completePersonnelCourse(personnelId);
                });
            }
        });
    }

    private completeTask(task: TaskData) {
        // Check if this is a pitch task
        if (task.label === 'Create Investor Pitch' && task.requiredSkills.includes('pitching')) {
            // Create a pitch node when pitch task is completed
            const assignedPersonnel = this.gameState.nodes.find(node =>
                node.id === task.assignedPersonnelIds[0] && node.type === 'Personnel'
            ) as PersonnelData;

            if (assignedPersonnel) {
                const newPitch: PitchData = {
                    id: `pitch-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
                    label: 'Investor Pitch',
                    type: 'Pitch',
                    description: 'A compelling pitch presentation for angel investors',
                    quality: Math.min(0.5 + (assignedPersonnel.efficiency * 0.5), 1.0),
                    createdBy: assignedPersonnel.id,
                    createdAt: Date.now(),
                    isCompleted: false, // Make it a normal item that can be used
                    position: {
                        x: task.position?.x || Math.random() * 400 + 100,
                        y: task.position?.y || Math.random() * 400 + 100
                    }
                };

                // Add pitch to game state
                this.gameState.nodes.push(newPitch);
                this.emitStateChange('NODE_ADDED', newPitch);

                // Unassign all personnel from the task and position them outside
                const taskPosition = task.position || { x: 200, y: 200 };
                task.assignedPersonnelIds.forEach(personnelId => {
                    const personnel = this.gameState.nodes.find(node =>
                        node.id === personnelId && node.type === 'Personnel'
                    ) as PersonnelData;

                    if (personnel) {
                        // Clear personnel assignment tracking
                        delete personnel.assignedToTaskId;
                        delete (personnel as any).assignedToTask;

                        // Move personnel outside the task
                        personnel.position = {
                            x: taskPosition.x + 100 + Math.random() * 100,
                            y: taskPosition.y + 100 + Math.random() * 100
                        };
                    }
                });

                // Remove the task node itself
                this.removeNode(task.id);

                return; // Exit early since we've handled everything for pitch tasks
            }
        }

        // Task completion logic would go here for other task types
        // For now, just emit an event
        this.emitStateChange('TASK_COMPLETED', task);
    }

    private updateFinances() {
        // Calculate expenses (salaries)
        let totalSalaries = 0;
        const personnel = this.gameState.nodes.filter(node => node.type === 'Personnel') as PersonnelData[];
        personnel.forEach(person => {
            totalSalaries += person.salary;
        });

        // Update finances
        this.gameState.companyFinances.expensesPerTick = totalSalaries;
        this.gameState.companyFinances.capital -= totalSalaries;
        this.gameState.companyFinances.totalExpenses += totalSalaries;

        // Add revenue (placeholder - would be calculated from products sold)
        this.gameState.companyFinances.capital += this.gameState.companyFinances.revenuePerTick;
        this.gameState.companyFinances.totalRevenue += this.gameState.companyFinances.revenuePerTick;
    }

    // Marketing System Methods
    createContent(payload: any): ActionResult {
        const { contentTemplateId, personnelId, targetSegments, platform } = payload;

        // Find the personnel creating the content
        const personnel = this.gameState.nodes.find(node =>
            node.id === personnelId && node.type === 'Personnel'
        ) as PersonnelData;

        if (!personnel) {
            return { success: false, message: 'Personnel not found' };
        }

        // Check if personnel has enough action points
        if (personnel.actionPoints < 1) {
            return { success: false, message: 'Not enough action points' };
        }

        // Create content node
        const newContent: ContentData = {
            id: `content-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            label: payload.label || 'New Content',
            type: 'Content',
            description: payload.description || 'Marketing content',
            contentType: payload.contentType || 'post',
            platform: platform || 'instagram',
            quality: Math.min(0.5 + (personnel.efficiency * 0.5), 1.0),
            targetSegments: targetSegments || ['young-professionals'],
            createdBy: personnelId,
            createdAt: Date.now(),
            performance: {
                views: 0,
                likes: 0,
                shares: 0,
                comments: 0,
                leadsGenerated: 0,
                engagementRate: 0,
                reach: 0
            },
            cost: payload.cost || 200,
            position: payload.position || {
                x: Math.random() * 400 + 100,
                y: Math.random() * 400 + 100
            }
        };

        // Deduct cost and action points
        this.gameState.companyFinances.capital -= newContent.cost;
        personnel.actionPoints -= 1;

        // Add content to game state
        this.gameState.nodes.push(newContent);
        this.gameState.marketingMetrics.contentCreated += 1;

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return {
            success: true,
            message: `Created ${newContent.label} for $${newContent.cost}`,
            data: newContent
        };
    }

    createCampaign(payload: any): ActionResult {
        const { contentIds, targetSegments, budget, duration } = payload;

        // Validate content exists
        const contents = contentIds.map((id: string) =>
            this.gameState.nodes.find(node => node.id === id && node.type === 'Content')
        ).filter(Boolean);

        if (contents.length === 0) {
            return { success: false, message: 'No valid content found for campaign' };
        }

        // Check budget
        if (this.gameState.companyFinances.capital < budget) {
            return { success: false, message: 'Not enough capital for campaign budget' };
        }

        // Create campaign node
        const newCampaign: CampaignData = {
            id: `campaign-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            label: payload.label || 'Marketing Campaign',
            type: 'Campaign',
            description: payload.description || 'A marketing campaign',
            contentIds: [...contentIds],
            targetSegments: [...targetSegments],
            budget: budget,
            spent: 0,
            duration: duration || 7, // 7 ticks default
            startedAt: 0,
            isActive: false,
            performance: {
                totalReach: 0,
                totalLeads: 0,
                totalConversions: 0,
                costPerLead: 0,
                conversionRate: 0,
                roi: 0
            },
            position: payload.position || {
                x: Math.random() * 400 + 100,
                y: Math.random() * 400 + 100
            }
        };

        this.gameState.nodes.push(newCampaign);
        this.emitStateChange('STATE_CHANGED', this.gameState);

        return {
            success: true,
            message: `Created campaign: ${newCampaign.label}`,
            data: newCampaign
        };
    }

    startCampaign(campaignId: string): ActionResult {
        const campaign = this.gameState.nodes.find(node =>
            node.id === campaignId && node.type === 'Campaign'
        ) as CampaignData;

        if (!campaign) {
            return { success: false, message: 'Campaign not found' };
        }

        if (campaign.isActive) {
            return { success: false, message: 'Campaign is already active' };
        }

        if (this.gameState.companyFinances.capital < campaign.budget) {
            return { success: false, message: 'Not enough capital to start campaign' };
        }

        campaign.isActive = true;
        campaign.startedAt = Date.now();
        this.gameState.marketingMetrics.activeCampaigns += 1;

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return {
            success: true,
            message: `Started campaign: ${campaign.label}`,
            data: campaign
        };
    }

    stopCampaign(campaignId: string): ActionResult {
        const campaign = this.gameState.nodes.find(node =>
            node.id === campaignId && node.type === 'Campaign'
        ) as CampaignData;

        if (!campaign) {
            return { success: false, message: 'Campaign not found' };
        }

        if (!campaign.isActive) {
            return { success: false, message: 'Campaign is not active' };
        }

        campaign.isActive = false;
        this.gameState.marketingMetrics.activeCampaigns = Math.max(0, this.gameState.marketingMetrics.activeCampaigns - 1);

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return {
            success: true,
            message: `Stopped campaign: ${campaign.label}`,
            data: campaign
        };
    }

    generateLeads(payload: any): ActionResult {
        // This would be called automatically by content performance processing
        // For now, just return success
        return { success: true, message: 'Leads generation processed' };
    }

    convertLead(leadId: string): ActionResult {
        const lead = this.gameState.nodes.find(node =>
            node.id === leadId && node.type === 'Lead'
        ) as LeadData;

        if (!lead) {
            return { success: false, message: 'Lead not found' };
        }

        // Convert lead to customer
        const newCustomer: CustomerData = {
            id: `customer-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            label: `Customer from ${lead.source}`,
            type: 'Customer',
            description: 'A converted customer',
            segmentId: lead.segmentId,
            acquisitionSource: lead.source,
            lifetimeValue: 0,
            loyaltyLevel: 0.5,
            purchaseHistory: [],
            lastPurchaseAt: 0,
            churnRisk: 0.1,
            position: {
                x: lead.position?.x || Math.random() * 400 + 100,
                y: lead.position?.y || Math.random() * 400 + 100
            }
        };

        // Remove lead and add customer
        this.removeNode(leadId);
        this.gameState.nodes.push(newCustomer);
        this.gameState.marketingMetrics.totalCustomers += 1;

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return {
            success: true,
            message: `Lead converted to customer`,
            data: newCustomer
        };
    }

    updateCustomer(payload: any): ActionResult {
        // Customer update logic would go here
        return { success: true, message: 'Customer updated' };
    }

    processContentPerformance(contentId: string): ActionResult {
        // Content performance processing logic would go here
        return { success: true, message: 'Content performance processed' };
    }

    updateMarketingMetrics(): ActionResult {
        // Calculate marketing metrics from current state
        const leads = this.gameState.nodes.filter(node => node.type === 'Lead');
        const customers = this.gameState.nodes.filter(node => node.type === 'Customer');
        const content = this.gameState.nodes.filter(node => node.type === 'Content');
        const activeCampaigns = this.gameState.nodes.filter(node =>
            node.type === 'Campaign' && (node as CampaignData).isActive
        );

        this.gameState.marketingMetrics.totalLeads = leads.length;
        this.gameState.marketingMetrics.totalCustomers = customers.length;
        this.gameState.marketingMetrics.contentCreated = content.length;
        this.gameState.marketingMetrics.activeCampaigns = activeCampaigns.length;

        // Calculate conversion rate
        if (this.gameState.marketingMetrics.totalLeads > 0) {
            this.gameState.marketingMetrics.conversionRate =
                this.gameState.marketingMetrics.totalCustomers /
                (this.gameState.marketingMetrics.totalLeads + this.gameState.marketingMetrics.totalCustomers);
        }

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return { success: true, message: 'Marketing metrics updated' };
    }

    private emitStateChange(eventType: GameEventType, data?: any) {
        const event: GameEvent = {
            type: eventType,
            data: data,
            timestamp: Date.now()
        };

        this.emit('stateChanged', this.gameState);
        this.emit(eventType, event);
    }

    // Pitch and Angel Founder System Methods
    createPitch(payload: any): ActionResult {
        const { personnelId, targetAngelFounderId } = payload;

        // Find the personnel creating the pitch
        const personnel = this.gameState.nodes.find(node =>
            node.id === personnelId && node.type === 'Personnel'
        ) as PersonnelData;

        if (!personnel) {
            return { success: false, message: 'Personnel not found' };
        }

        // Check if personnel has pitching skill
        if (!personnel.skills.includes('pitching')) {
            return { success: false, message: 'Personnel does not have pitching skill' };
        }

        // Check if personnel has enough action points
        if (personnel.actionPoints < 1) {
            return { success: false, message: 'Not enough action points' };
        }

        // Create pitch task
        const newPitchTask: TaskData = {
            id: `pitch-task-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            label: 'Create Investor Pitch',
            type: 'Task',
            description: 'Create a compelling pitch presentation for angel investors',
            requiredSkills: ['pitching'],
            timeToComplete: 5, // 5 ticks to complete
            progress: 0,
            assignedPersonnelIds: [],
            inputNodeIds: [],
            outputNodeId: undefined, // Will create a pitch node when completed
            position: payload.position || {
                x: Math.random() * 400 + 100,
                y: Math.random() * 400 + 100
            }
        };

        // Add task to game state
        this.gameState.nodes.push(newPitchTask);
        this.emitStateChange('NODE_ADDED', newPitchTask);

        return {
            success: true,
            message: `Created pitch task: ${newPitchTask.label}`,
            data: newPitchTask
        };
    }

    presentPitch(payload: any): ActionResult {
        const { pitchId, angelFounderId } = payload;

        const pitch = this.gameState.nodes.find(node =>
            node.id === pitchId && node.type === 'Pitch'
        ) as PitchData;

        const angelFounder = this.gameState.nodes.find(node =>
            node.id === angelFounderId && node.type === 'AngelFounder'
        ) as AngelFounderData;

        if (!pitch) {
            return { success: false, message: 'Pitch not found' };
        }

        if (!angelFounder) {
            return { success: false, message: 'Angel founder not found' };
        }

        if (!angelFounder.isAvailable) {
            return { success: false, message: 'Angel founder is no longer available' };
        }

        // Present the pitch
        if (!pitch.presentedTo) {
            pitch.presentedTo = [];
        }
        pitch.presentedTo.push(angelFounderId);

        // Check if pitch is good enough (based on quality and angel founder requirements)
        const pitchSuccess = pitch.quality > 0.7; // 70% quality threshold

        if (pitchSuccess) {
            angelFounder.pitchId = pitchId;
            angelFounder.isAvailable = false;

            this.emitStateChange('STATE_CHANGED', this.gameState);
            return {
                success: true,
                message: `Angel founder ${angelFounder.label} is interested! You can now secure funding.`,
                data: { pitchAccepted: true, angelFounder }
            };
        } else {
            this.emitStateChange('STATE_CHANGED', this.gameState);
            return {
                success: true,
                message: `Angel founder ${angelFounder.label} was not convinced by the pitch. Try improving it or finding another investor.`,
                data: { pitchAccepted: false }
            };
        }
    }

    secureAngelFunding(payload: any): ActionResult {
        const { angelFounderId } = payload;

        const angelFounder = this.gameState.nodes.find(node =>
            node.id === angelFounderId && node.type === 'AngelFounder'
        ) as AngelFounderData;

        if (!angelFounder) {
            return { success: false, message: 'Angel founder not found' };
        }

        if (angelFounder.fundingProvided) {
            return { success: false, message: 'Funding has already been secured from this angel founder' };
        }

        if (!angelFounder.pitchId) {
            return { success: false, message: 'No successful pitch has been presented to this angel founder' };
        }

        // Provide funding
        this.gameState.companyFinances.capital += angelFounder.fundingAmount;
        angelFounder.fundingProvided = true;

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return {
            success: true,
            message: `Secured $${angelFounder.fundingAmount.toLocaleString()} funding from ${angelFounder.label}!`,
            data: { fundingAmount: angelFounder.fundingAmount }
        };
    }

    // Cleanup
    destroy() {
        this.stopGameLoop();
    }
}

// Singleton instance
export const gameEngine = new GameEngine();
