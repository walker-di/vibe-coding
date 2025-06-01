# Sprint Backlog: ProductGraphTycoon

## Sprint 1 (2 weeks) - Foundation & Core Infrastructure

| **User Story** | **Task** | **Priority** | **Effort (SP)** | **Assignee** | **Status** | **Definition of Done** |
|----------------|----------|--------------|-----------------|--------------|------------|------------------------|
| **As a developer, I want to set up the project foundation** | Initialize Svelte 5 project with TypeScript | High | 2 | Dev Lead | Not Started | Project builds successfully, TypeScript configured |
| | Configure Tailwind CSS 4 | High | 1 | Frontend Dev | Not Started | Tailwind classes work in components |
| | Install and configure Cytoscape.js | High | 2 | Frontend Dev | Not Started | Basic Cytoscape instance renders |
| | Set up project structure and folders | High | 1 | Dev Lead | Not Started | All folders created per architecture |
| **As a developer, I want basic type definitions** | Create core TypeScript interfaces | High | 3 | Backend Dev | Not Started | All node types and game state interfaces defined |
| | Define EdgeData and ActionResult types | Medium | 2 | Backend Dev | Not Started | Edge and action types complete with validation |
| **As a developer, I want a basic game engine** | Implement GameEngine class structure | High | 5 | Backend Dev | Not Started | Engine initializes, manages state, processes basic actions |
| | Create basic node management (add/remove) | High | 3 | Backend Dev | Not Started | Can add/remove nodes from game state |
| | Implement simple tick system | Medium | 3 | Backend Dev | Not Started | Game advances time, processes basic updates |

---

## Sprint 2 (2 weeks) - Core Game Components & Basic Interaction

| **User Story** | **Task** | **Priority** | **Effort (SP)** | **Assignee** | **Status** | **Definition of Done** |
|----------------|----------|--------------|-----------------|--------------|------------|------------------------|
| **As a player, I want to see the game world** | Create CytoscapeGraph.svelte component | High | 5 | Frontend Dev | Not Started | Graph renders nodes and edges from props |
| | Implement basic Cytoscape styling | High | 3 | Frontend Dev | Not Started | Different node types have distinct visual styles |
| | Add reactive updates with $effect | High | 4 | Frontend Dev | Not Started | Graph updates when game state changes |
| **As a player, I want to interact with nodes** | Implement node click selection | High | 2 | Frontend Dev | Not Started | Clicking node triggers selection event |
| | Add basic drag and drop | Medium | 4 | Frontend Dev | Not Started | Can drag nodes, detect drop targets |
| | Create context menu component | Medium | 3 | Frontend Dev | Not Started | Right-click shows context menu with actions |
| **As a developer, I want state management** | Create gameStore with Svelte 5 runes | High | 4 | Frontend Dev | Not Started | Store manages reactive game state |
| | Create uiStore for UI state | Medium | 2 | Frontend Dev | Not Started | UI state (selection, menus) managed reactively |
| | Bridge engine events to stores | High | 3 | Backend Dev | Not Started | Engine state changes update Svelte stores |

---

## Sprint 3 (2 weeks) - Game Mechanics & Node Types

| **User Story** | **Task** | **Priority** | **Effort (SP)** | **Assignee** | **Status** | **Definition of Done** |
|----------------|----------|--------------|-----------------|--------------|------------|------------------------|
| **As a player, I want different types of game entities** | Implement PersonnelNode class | High | 3 | Backend Dev | Not Started | Personnel nodes with skills, efficiency, salary |
| | Implement ProductNode class | High | 3 | Backend Dev | Not Started | Product nodes with quality, features, progress |
| | Implement TaskNode class | High | 4 | Backend Dev | Not Started | Task nodes with requirements, progress tracking |
| | Implement ResourceNode class | Medium | 2 | Backend Dev | Not Started | Resource nodes with quantities, costs |
| **As a player, I want to assign personnel to tasks** | Create assignment action logic | High | 5 | Backend Dev | Not Started | Can assign personnel to compatible tasks |
| | Implement task progress system | High | 4 | Backend Dev | Not Started | Tasks progress based on assigned personnel |
| | Add visual feedback for assignments | Medium | 3 | Frontend Dev | Not Started | Edges show assignments, visual states update |
| **As a player, I want to see game information** | Create InfoPanel component | Medium | 3 | Frontend Dev | Not Started | Shows detailed info for selected nodes |
| | Create HUD component | Medium | 2 | Frontend Dev | Not Started | Shows money, time, key metrics |

---

## Sprint 4 (2 weeks) - Advanced Interactions & Polish

| **User Story** | **Task** | **Priority** | **Effort (SP)** | **Assignee** | **Status** | **Definition of Done** |
|----------------|----------|--------------|-----------------|--------------|------------|------------------------|
| **As a player, I want to combine nodes meaningfully** | Implement node combination logic | High | 5 | Backend Dev | Not Started | Dragging compatible nodes creates new relationships |
| | Add validation for combinations | High | 3 | Backend Dev | Not Started | Invalid combinations show feedback |
| | Create product development workflow | High | 4 | Backend Dev | Not Started | Ideas → Development → Products workflow works |
| **As a player, I want financial management** | Implement company finances system | High | 4 | Backend Dev | Not Started | Track revenue, expenses, capital |
| | Add salary payment system | Medium | 3 | Backend Dev | Not Started | Personnel cost money each tick |
| | Create basic market simulation | Medium | 4 | Backend Dev | Not Started | Products generate revenue based on quality |
| **As a player, I want a polished experience** | Improve visual design and animations | Medium | 4 | Frontend Dev | Not Started | Smooth animations, polished UI |
| | Add game tutorial/onboarding | Low | 3 | Frontend Dev | Not Started | New players understand basic mechanics |
| | Implement save/load functionality | Medium | 3 | Backend Dev | Not Started | Game state persists between sessions |

---

## Sprint 5 (2 weeks) - Testing, Optimization & Release Prep

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
- Sprint 2 depends on Sprint 1 foundation
- Sprint 3 depends on Sprint 2 components
- Sprint 4 builds on Sprint 3 mechanics
- Sprint 5 requires completed features from previous sprints

### Risk Mitigation
- **Cytoscape Integration Complexity**: Allocated extra time in Sprint 2 for learning curve
- **State Management Complexity**: Dedicated tasks for bridging engine and UI state
- **Performance Concerns**: Dedicated optimization sprint (Sprint 5)

This backlog provides a structured approach to building your ProductGraphTycoon game, with clear deliverables and dependencies mapped out across 5 two-week sprints.