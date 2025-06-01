# Sprint Backlog: ProductGraphTycoon

## ✅ Sprint 1 (2 weeks) - Foundation & Core Infrastructure (COMPLETED)

| **User Story** | **Task** | **Priority** | **Effort (SP)** | **Assignee** | **Status** | **Definition of Done** |
|----------------|----------|--------------|-----------------|--------------|------------|------------------------|
| **As a developer, I want to set up the project foundation** | Initialize Svelte 5 project with TypeScript | High | 2 | Dev Lead | ✅ Completed | Project builds successfully, TypeScript configured |
| | Configure Tailwind CSS 4 | High | 1 | Frontend Dev | ✅ Completed | Tailwind classes work in components |
| | Install and configure Cytoscape.js | High | 2 | Frontend Dev | ✅ Completed | Basic Cytoscape instance renders |
| | Set up project structure and folders | High | 1 | Dev Lead | ✅ Completed | All folders created per architecture |
| **As a developer, I want basic type definitions** | Create core TypeScript interfaces | High | 3 | Backend Dev | ✅ Completed | All node types and game state interfaces defined |
| | Define EdgeData and ActionResult types | Medium | 2 | Backend Dev | ✅ Completed | Edge and action types complete with validation |
| **As a developer, I want a basic game engine** | Implement GameEngine class structure | High | 5 | Backend Dev | ✅ Completed | Engine initializes, manages state, processes basic actions |
| | Create basic node management (add/remove) | High | 3 | Backend Dev | ✅ Completed | Can add/remove nodes from game state |
| | Implement simple tick system | Medium | 3 | Backend Dev | ✅ Completed | Game advances time, processes basic updates |

**Additional Tasks Completed:**
| **User Story** | **Task** | **Priority** | **Effort (SP)** | **Assignee** | **Status** | **Definition of Done** |
|----------------|----------|--------------|-----------------|--------------|------------|------------------------|
| **As a player, I want to see the game world** | Create CytoscapeGraph.svelte component | High | 5 | Frontend Dev | ✅ Completed | Graph renders nodes and edges with full interaction |
| | Implement comprehensive Cytoscape styling | High | 3 | Frontend Dev | ✅ Completed | All node types have distinct visual styles |
| | Add reactive updates with Svelte stores | High | 4 | Frontend Dev | ✅ Completed | Graph updates when game state changes |
| **As a player, I want to interact with nodes** | Implement node click selection | High | 2 | Frontend Dev | ✅ Completed | Clicking node triggers selection and info panel |
| | Add basic drag and drop | Medium | 4 | Frontend Dev | ✅ Completed | Can drag nodes, detect drop targets |
| | Create context menu component | Medium | 3 | Frontend Dev | ✅ Completed | Right-click shows context menu with actions |
| **As a developer, I want state management** | Create gameStore with Svelte stores | High | 4 | Frontend Dev | ✅ Completed | Store manages reactive game state |
| | Create uiStore for UI state | Medium | 2 | Frontend Dev | ✅ Completed | UI state (selection, menus) managed reactively |
| | Bridge engine events to stores | High | 3 | Backend Dev | ✅ Completed | Engine state changes update Svelte stores |
| **As a player, I want game information** | Create InfoPanel component | Medium | 3 | Frontend Dev | ✅ Completed | Shows detailed info for selected nodes |
| | Create HUD component | Medium | 2 | Frontend Dev | ✅ Completed | Shows money, time, key metrics |
| **As a player, I want game controls** | Implement game controls (pause/resume/speed) | Medium | 2 | Frontend Dev | ✅ Completed | Can control game flow and speed |

**Sprint 1 Achievements:**
- Complete project foundation with modern tech stack (Svelte 5, TypeScript, Tailwind CSS 4)
- Comprehensive game engine with state management, node/edge operations, and tick system
- Interactive graph visualization with Cytoscape.js integration
- Full UI framework with HUD, InfoPanel, ContextMenu, and game controls
- Reactive state management bridging game engine and UI
- Initial game state with Founder, Idea, and Capital nodes

---

## ✅ Sprint 2 (2 weeks) - Game Mechanics & Node Interactions (COMPLETED)

| **User Story** | **Task** | **Priority** | **Effort (SP)** | **Assignee** | **Status** | **Definition of Done** |
|----------------|----------|--------------|-----------------|--------------|------------|------------------------|
| **As a player, I want to purchase items and expand my company** | Create Stacklands-style shop interface | High | 4 | Frontend Dev | ✅ Completed | Compact 64x64px cards with 7 purchasable items |
| | Implement shop integration in HUD | High | 2 | Frontend Dev | ✅ Completed | Shop positioned below financial summary |
| | Add real-time affordability checking | High | 3 | Backend Dev | ✅ Completed | Visual feedback for affordable/unaffordable items |
| | Create automatic node generation on purchase | High | 3 | Backend Dev | ✅ Completed | Purchased items appear as nodes in graph |
| **As a player, I want responsive graph interaction** | Optimize Cytoscape zoom sensitivity | High | 2 | Frontend Dev | ✅ Completed | 5x faster zoom (wheelSensitivity: 1.0) |
| | Improve node positioning and layout | Medium | 3 | Frontend Dev | ✅ Completed | Cose layout with proper node spacing |
| | Add intelligent element diffing | High | 4 | Frontend Dev | ✅ Completed | Only update changed nodes/edges for performance |
| **As a player, I want to train personnel through courses** | Create course system with predefined courses | High | 5 | Backend Dev | ✅ Completed | 15+ courses across 4 categories with costs and durations |
| | Implement course modal interface | High | 3 | Frontend Dev | ✅ Completed | Modal with category filtering and course selection |
| | Add compound drag-and-drop for enrollment | High | 4 | Frontend Dev | ✅ Completed | Personnel visually group inside course nodes |
| | Implement automatic course progression | High | 3 | Backend Dev | ✅ Completed | Courses start/complete automatically, personnel gain skills |
| | Add skill enhancement and efficiency boosts | Medium | 3 | Backend Dev | ✅ Completed | Personnel gain new skills and efficiency upon completion |
| **As a player, I want to create and manage tasks** | Create task creation workflow | High | 4 | Backend Dev | 🔄 In Progress | Can create tasks with requirements and outputs |
| | Implement task assignment logic | High | 5 | Backend Dev | Not Started | Assign personnel to tasks, track progress |
| | Add task completion rewards | Medium | 3 | Backend Dev | Not Started | Completed tasks generate products/resources |
| | Add task progress tracking | Medium | 3 | Backend Dev | Not Started | Tasks show progress based on assigned personnel |
| **As a player, I want to develop products** | Implement idea-to-product workflow | High | 5 | Backend Dev | Not Started | Convert ideas into development tasks |
| | Add product quality system | Medium | 4 | Backend Dev | Not Started | Product quality affects market value |
| | Create product feature system | Medium | 3 | Backend Dev | Not Started | Products have features that affect appeal |
| **As a player, I want meaningful node combinations** | Implement drag-and-drop node combination | High | 5 | Frontend Dev | Not Started | Dragging compatible nodes creates relationships |
| | Add combination validation and feedback | High | 3 | Frontend Dev | Not Started | Invalid combinations show helpful feedback |
| | Create visual feedback for valid combinations | Medium | 2 | Frontend Dev | Not Started | Highlight valid drop targets during drag |
| **As a player, I want financial management** | Implement basic market system | High | 4 | Backend Dev | Not Started | Products can be sold for revenue |
| | Add expense tracking (salaries, resources) | High | 3 | Backend Dev | ✅ Completed | Track and display ongoing expenses |
| | Create financial alerts and warnings | Medium | 2 | Frontend Dev | Not Started | Warn when running low on capital |

**Sprint 2 Achievements:**
- ✅ **Stacklands-Style Shop Interface**: Complete with 7 purchasable items in compact 64x64px cards
- ✅ **Enhanced Graph Interaction**: 5x faster zoom, intelligent element diffing, optimized performance
- ✅ **Real-time Purchase System**: Affordability checking, automatic node creation, capital integration
- ✅ **UI/UX Improvements**: Shop integrated in HUD below financial summary, responsive design
- ✅ **Action Points System**: Complete implementation with visual feedback and weekly restoration
- ✅ **Timer & Progress System**: Week-based progression with real-time progress bar
- ✅ **Game Speed Controls**: Smooth speed transitions with pause-aware timing
- ✅ **Course Training System**: 15+ predefined courses with automatic progression and skill enhancement
- ✅ **Compound Drag-and-Drop**: Visual grouping of personnel within course nodes using cytoscape extension
- ✅ **Personnel Development**: Skill acquisition and efficiency boosts through course completion

**Completed Features:**
- Stacklands-style shop with 8 items: 4 Personnel, 2 Resources, 1 Idea, 1 Course
- Real-time affordability checking with visual feedback (enabled/disabled states)
- Automatic node creation with proper positioning and styling
- Enhanced Cytoscape performance (wheelSensitivity: 1.0, intelligent diffing)
- Shop integration in HUD positioned below financial information
- Compact card design optimized for horizontal space (64x64px)
- Cost display in k-format (3k, 4k) for space efficiency
- **Action Points System**: 3 points per personnel per week with visual feedback
- **Visual Action Points Display**: Personnel nodes show ⚡ 3/3 format
- **Progress Bar Timer**: Week completion shown as 0-100% progress bar
- **Week-based Timing**: 1 tick = 1 week = 120 seconds
- **Speed Controls**: Smooth transitions between 0.5x to 5x speeds
- **Course Training System**: 15+ predefined courses across 4 categories
- **Course Modal Interface**: Category filtering and detailed course information
- **Compound Drag-and-Drop**: Personnel visually group inside course nodes
- **Automatic Course Progression**: Courses start when enrolled, complete after duration
- **Skill Enhancement**: Personnel gain new skills and efficiency boosts upon completion
- **Course Cost Management**: Courses cost $2,000-$3,800 with capital validation

---

## 🚀 Sprint 3 (2 weeks) - Task System & Action Point Mechanics (CURRENT PRIORITY)

| **User Story** | **Task** | **Priority** | **Effort (SP)** | **Assignee** | **Status** | **Definition of Done** |
|----------------|----------|--------------|-----------------|--------------|------------|------------------------|
| **As a player, I want to use action points strategically** | Implement diverse action point costs | High | 3 | Backend Dev | Not Started | Different actions cost different amounts (1-3 points) |
| | Add action point feedback and tooltips | Medium | 2 | Frontend Dev | Not Started | Clear feedback on action costs and remaining points |
| | Create action point efficiency mechanics | Medium | 3 | Backend Dev | Not Started | Personnel efficiency affects action point effectiveness |
| **As a player, I want to create and manage tasks** | Complete task creation workflow | High | 4 | Backend Dev | Not Started | Can create tasks with requirements and outputs |
| | Implement task assignment logic (using action points) | High | 5 | Backend Dev | Not Started | Assign personnel to tasks, costs action points |
| | Add task completion rewards | High | 3 | Backend Dev | Not Started | Completed tasks generate products/resources |
| | Add task progress tracking | Medium | 3 | Backend Dev | Not Started | Tasks show progress based on assigned personnel |
| **As a player, I want meaningful node combinations** | Implement drag-and-drop node combination | High | 5 | Frontend Dev | Not Started | Dragging compatible nodes creates relationships |
| | Add combination validation and feedback | High | 3 | Frontend Dev | Not Started | Invalid combinations show helpful feedback |
| | Create visual feedback for valid combinations | Medium | 2 | Frontend Dev | Not Started | Highlight valid drop targets during drag |
| **As a player, I want to develop products** | Implement idea-to-product workflow | High | 5 | Backend Dev | Not Started | Convert ideas into development tasks |
| | Add product quality system | Medium | 4 | Backend Dev | Not Started | Product quality affects market value |
| | Create product feature system | Medium | 3 | Backend Dev | Not Started | Products have features that affect appeal |
| **As a player, I want basic revenue generation** | Implement basic market system | High | 4 | Backend Dev | Not Started | Products can be sold for revenue |
| | Add simple product sales mechanics | Medium | 3 | Backend Dev | Not Started | Products generate revenue over time |
| | Create financial alerts and warnings | Medium | 2 | Frontend Dev | Not Started | Warn when running low on capital |

---

## Sprint 4 (2 weeks) - Advanced Features & Market Dynamics

| **User Story** | **Task** | **Priority** | **Effort (SP)** | **Assignee** | **Status** | **Definition of Done** |
|----------------|----------|--------------|-----------------|--------------|------------|------------------------|
| **As a player, I want advanced market dynamics** | Implement market demand fluctuation | High | 4 | Backend Dev | Not Started | Market demand changes over time |
| | Add competition and market saturation | Medium | 3 | Backend Dev | Not Started | Multiple products compete in markets |
| | Create market research mechanics | Medium | 3 | Backend Dev | Not Started | Can research market trends and opportunities |
| **As a player, I want resource management** | Implement resource consumption system | High | 4 | Backend Dev | Not Started | Tasks consume resources, track inventory |
| | Add resource purchasing and suppliers | Medium | 3 | Backend Dev | Not Started | Can buy resources from suppliers |
| | Create resource optimization challenges | Medium | 2 | Backend Dev | Not Started | Efficient resource use affects profitability |
| **As a player, I want advanced personnel features** | Implement personnel training system | Medium | 4 | Backend Dev | Not Started | Can train personnel to improve skills |
| | Add personnel specialization paths | Medium | 3 | Backend Dev | Not Started | Personnel can specialize in specific areas |
| | Add personnel skill matching for tasks | High | 3 | Backend Dev | Not Started | Personnel efficiency affects task completion |
| | Implement personnel morale system | Medium | 3 | Backend Dev | Not Started | Morale affects efficiency, can be improved |
| **As a player, I want visual improvements** | Add animations for node interactions | Medium | 3 | Frontend Dev | Not Started | Smooth animations for drag/drop, selections |
| | Implement graph layout improvements | Medium | 2 | Frontend Dev | Not Started | Better automatic layout and manual positioning |

---

## Sprint 5 (2 weeks) - Polish & User Experience

| **User Story** | **Task** | **Priority** | **Effort (SP)** | **Assignee** | **Status** | **Definition of Done** |
|----------------|----------|--------------|-----------------|--------------|------------|------------------------|
| **As a player, I want a polished experience** | Improve visual design and animations | Medium | 4 | Frontend Dev | Not Started | Smooth animations, polished UI |
| | Create visual themes and customization | Low | 2 | Frontend Dev | Not Started | Different visual themes for the game |
| | Add game tutorial/onboarding | Medium | 3 | Frontend Dev | Not Started | New players understand basic mechanics |
| | Implement save/load functionality | High | 3 | Backend Dev | Not Started | Game state persists between sessions |
| **As a player, I want game progression** | Implement achievement system | Medium | 3 | Backend Dev | Not Started | Unlock achievements for milestones |
| | Add difficulty scaling | Medium | 2 | Backend Dev | Not Started | Game becomes more challenging over time |
| | Create scenario-based challenges | Low | 4 | Backend Dev | Not Started | Specific business scenarios to solve |
| **As a player, I want team dynamics** | Create team dynamics and synergies | Medium | 3 | Backend Dev | Not Started | Personnel work better in compatible teams |
| | Add advanced personnel interactions | Low | 2 | Backend Dev | Not Started | Personnel can collaborate on complex tasks |

---

## Sprint 6 (2 weeks) - Testing, Optimization & Release Prep

| **User Story** | **Task** | **Priority** | **Effort (SP)** | **Assignee** | **Status** | **Definition of Done** |
|----------------|----------|--------------|-----------------|--------------|------------|------------------------|
| **As a developer, I want reliable code** | Write unit tests for game engine | High | 5 | Backend Dev | Not Started | Core game logic has >80% test coverage |
| | Write component tests for Svelte components | Medium | 4 | Frontend Dev | Not Started | Key components have integration tests |
| | Add end-to-end testing | Medium | 3 | QA/Dev | Not Started | Critical user flows tested |
| **As a player, I want good performance** | Optimize Cytoscape performance | Medium | 4 | Frontend Dev | Not Started | Smooth performance with 100+ nodes |
| | Optimize game engine performance | Medium | 3 | Backend Dev | Not Started | Game ticks process quickly |
| | Add performance monitoring | Low | 2 | Dev Lead | Not Started | Can track performance metrics |
| **As a stakeholder, I want a deployable product** | Set up build and deployment pipeline | High | 3 | Dev Lead | Not Started | Automated builds and deployments |
| | Create production configuration | Medium | 2 | Dev Lead | Not Started | Production-ready configuration |
| | Bug fixes and polish | High | 5 | All | Not Started | Critical bugs resolved, UX polished |

---

## Notes & Assumptions

### Team Composition
- **Dev Lead**: 1 person (project setup, architecture, deployment)
- **Frontend Dev**: 1 person (Svelte components, Cytoscape integration, UI/UX)
- **Backend Dev**: 1 person (game engine, business logic, data structures)
- **QA/Dev**: 0.5 person (testing, can be shared responsibility)

### Story Points Scale
- **1 SP**: 1-2 hours
- **2 SP**: 2-4 hours  
- **3 SP**: 4-8 hours
- **4 SP**: 1-1.5 days
- **5 SP**: 1.5-2 days

### Dependencies
- ✅ Sprint 1 & 2: Foundation and shop interface completed
- Sprint 3 depends on Sprint 2 shop system (completed)
- Sprint 4 builds on Sprint 3 task mechanics
- Sprint 5 requires completed core features from previous sprints
- Sprint 6 requires stable features for testing and optimization

### Risk Mitigation
- ✅ **Cytoscape Integration Complexity**: Successfully resolved with optimized performance
- ✅ **State Management Complexity**: Implemented with Svelte 5 runes and reactive stores
- ✅ **Shop Interface Design**: Completed with Stacklands-style compact cards
- **Task System Complexity**: Current focus for Sprint 3, may require additional time
- **Performance Concerns**: Dedicated optimization sprint (Sprint 6)

### Current Status Summary
- **Sprints 1-2**: ✅ Completed (Foundation, Graph Canvas, Shop Interface, Action Points, Timer System)
- **Sprint 3**: 🚀 Current Priority (Task System & Action Point Mechanics)
- **Sprints 4-6**: ⏳ Planned (Advanced Features, Polish, Testing)

### Recent Major Achievements (Latest Sprint Extension)
- ✅ **Action Points System**: Complete implementation with 3 points per personnel per week
- ✅ **Visual Feedback**: Action points displayed on personnel nodes (⚡ 3/3 format)
- ✅ **Timer Overhaul**: Week-based progression with real-time progress bar (0-100%)
- ✅ **Speed Control Fixes**: Smooth transitions between speeds without progress jumps
- ✅ **Immediate Tick System**: No more stacking at 100%, immediate week transitions
- ✅ **Pause-Aware Timing**: Maintains progress accurately during pauses and resumes
- ✅ **Course Training System**: 15+ predefined courses across Technical, Design, Management, Business categories
- ✅ **Compound Drag-and-Drop**: Personnel visually group inside course nodes using cytoscape-compound-drag-and-drop
- ✅ **Automatic Course Progression**: Courses start when personnel enroll, complete after specified duration
- ✅ **Skill Enhancement System**: Personnel gain new skills and efficiency boosts upon course completion
- ✅ **Course Cost Management**: Courses cost $2,000-$3,800 with real-time capital validation

### Latest Major Update: Enhanced Training Course System
- ✅ **Real-Time Course Progress**: Individual personnel countdown timers with live updates every 100ms
- ✅ **Game Speed Synchronization**: Course progress now respects game speed multipliers (0.5x to 5x)
- ✅ **Seconds-Based Duration**: Courses now use seconds instead of weeks for more engaging progression
- ✅ **Individual Progress Tracking**: Each personnel has separate countdown timers and progress bars
- ✅ **Progress Reset on Exit**: Personnel who leave courses early have their progress completely reset
- ✅ **Project Creation Skills**: New skills (web-development, app-development, project-creation) enable creating projects
- ✅ **Context Menu Project Creation**: Personnel with appropriate skills can create websites and mobile apps
- ✅ **Enhanced InfoPanel**: Real-time progress bars, completion indicators, and improved layout
- ✅ **Pause/Resume Compatibility**: Course progress properly pauses and resumes with game state
- ✅ **Speed Change Handling**: Existing course progress updates immediately when game speed changes
- ✅ **Visual Completion Feedback**: Progress bars turn green and show "✅ Completed!" when finished

This backlog provides a structured approach to building ProductGraphTycoon, with clear deliverables and dependencies mapped out across 6 two-week sprints. The foundation is solid, the core purchase/expansion mechanics are working, the action points system provides strategic resource management, and the course training system enables personnel development through visual compound node interactions.