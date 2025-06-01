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
    GameEvent,
    GameEventType
} from '../types';

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
    private pausedAt: number | null = null;

    constructor() {
        super();
        this.gameState = this.initializeGameState();
    }

    private initializeGameState(): GameState {
        // Create initial game state with some starting nodes
        const initialNodes: BaseNodeData[] = [
            {
                id: 'founder-1',
                label: 'Founder',
                type: 'Personnel',
                description: 'Company founder with entrepreneurial skills',
                skills: ['leadership', 'vision', 'networking'],
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
            } as ResourceData
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

        // Assign personnel to task
        personnel.assignedToTaskId = taskId;
        if (!task.assignedPersonnelIds.includes(personnelId)) {
            task.assignedPersonnelIds.push(personnelId);
        }

        // Create edge to represent assignment
        const edgeId = `assignment-${personnelId}-${taskId}`;
        const assignmentEdge: EdgeData = {
            id: edgeId,
            source: personnelId,
            target: taskId,
            label: 'assigned to',
            type: 'assignment'
        };

        this.gameState.edges.push(assignmentEdge);
        this.emitStateChange('STATE_CHANGED', this.gameState);

        return { success: true, message: 'Personnel assigned to task successfully' };
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

            // Remove assignment edge
            this.gameState.edges = this.gameState.edges.filter(
                edge => !(edge.source === personnelId && edge.target === personnel.assignedToTaskId && edge.type === 'assignment')
            );
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
        this.gameState.isPaused = true;
        this.pausedAt = Date.now(); // Store when we paused
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        this.emitStateChange('STATE_CHANGED', this.gameState);
        return { success: true, message: 'Game paused' };
    }

    resumeGame(): ActionResult {
        this.gameState.isPaused = false;

        // Adjust week start time to account for pause duration
        if (this.pausedAt && this.gameState.currentWeekStartTime) {
            const pauseDuration = Date.now() - this.pausedAt;
            this.gameState.currentWeekStartTime += pauseDuration;
        }

        this.startGameLoop();
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

        if (!this.gameState.isPaused) {
            const tickDuration = (120 * 1000) / this.gameState.gameSpeed; // Base tick is 120 seconds (1 week)
            this.tickInterval = setInterval(() => {
                this.tick();
            }, tickDuration);
        }
    }

    stopGameLoop() {
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
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

        // Enroll personnel
        course.enrolledPersonnelIds.push(personnelId);

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

        console.log(`Enrolled ${personnelId} in course ${courseId}. Personnel enrolledInCourse:`, (personnel as any).enrolledInCourse);
        console.log(`Positioned personnel at:`, personnel.position);

        // Start course if this is the first enrollment
        if (course.enrolledPersonnelIds.length === 1 && !course.isActive) {
            course.isActive = true;
            course.startTick = this.gameState.currentTick;
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
            course.startTick = undefined;
        }

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return {
            success: true,
            message: `${personnel.label} removed from ${course.label}`,
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
        course.startTick = this.gameState.currentTick;

        this.emitStateChange('STATE_CHANGED', this.gameState);
        return {
            success: true,
            message: `${course.label} course started`,
            data: { courseId }
        };
    }

    completeCourse(courseId: string): ActionResult {
        const course = this.gameState.nodes.find(node =>
            node.id === courseId && node.type === 'Course'
        ) as CourseData;

        if (!course) {
            return { success: false, message: `Course with id ${courseId} not found` };
        }

        if (course.isCompleted) {
            return { success: false, message: 'Course has already been completed' };
        }

        // Apply skill improvements and efficiency boosts to enrolled personnel
        const improvedPersonnel: string[] = [];
        course.enrolledPersonnelIds.forEach(personnelId => {
            const personnel = this.gameState.nodes.find(node =>
                node.id === personnelId && node.type === 'Personnel'
            ) as PersonnelData;

            if (personnel) {
                // Add new skills
                course.skillsImproved.forEach(skill => {
                    if (!personnel.skills.includes(skill)) {
                        personnel.skills.push(skill);
                    }
                });

                // Boost efficiency (cap at 1.0)
                personnel.efficiency = Math.min(1.0, personnel.efficiency + course.efficiencyBoost);
                improvedPersonnel.push(personnel.label);

                // Clear the personnel's enrolled course since course is completed
                delete (personnel as any).enrolledInCourse;

                // Move personnel outside the course
                const coursePosition = course.position || { x: 200, y: 200 };
                personnel.position = {
                    x: coursePosition.x + 100 + Math.random() * 100,
                    y: coursePosition.y + 100 + Math.random() * 100
                };
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

    private processCourses() {
        const courses = this.gameState.nodes.filter(node => node.type === 'Course') as CourseData[];

        courses.forEach(course => {
            if (course.isActive && !course.isCompleted && course.startTick !== undefined) {
                const ticksElapsed = this.gameState.currentTick - course.startTick;

                // Check if course duration has been reached
                if (ticksElapsed >= course.duration) {
                    this.completeCourse(course.id);
                }
            }
        });
    }

    private completeTask(task: TaskData) {
        // Task completion logic would go here
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

    private emitStateChange(eventType: GameEventType, data?: any) {
        const event: GameEvent = {
            type: eventType,
            data: data,
            timestamp: Date.now()
        };

        this.emit('stateChanged', this.gameState);
        this.emit(eventType, event);
    }

    // Cleanup
    destroy() {
        this.stopGameLoop();
    }
}

// Singleton instance
export const gameEngine = new GameEngine();
