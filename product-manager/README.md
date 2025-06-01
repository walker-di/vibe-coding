# ProductGraphTycoon

A business simulation game where players build and manage a product development company using an interactive node-based graph interface.

## 🎮 Current Features

### ✅ Core Infrastructure (Sprint 1 - Completed)
- **Interactive Graph Visualization**: Built with Cytoscape.js for smooth node manipulation
- **Real-time Game Engine**: Tick-based system with pause/resume and speed controls (0.5x to 3x)
- **Comprehensive UI Framework**: HUD, InfoPanel, ContextMenu with reactive state management
- **Financial System**: Track company capital, revenue, and expenses in real-time
- **Initial Game State**: Start with Founder, Mobile App Idea, and $50,000 capital

### ✅ Personnel Management (Sprint 2 - Completed)
- **Hiring System**: Choose from 12 diverse personnel templates across 4 categories
- **Personnel Categories**:
  - **Developers**: Junior ($800), Senior ($1500), Full-Stack ($1200), Mobile ($1100)
  - **Designers**: UI/UX ($1000), Graphic ($900)
  - **Managers**: Project ($1300), Product ($1400)
  - **Specialists**: QA ($900), DevOps ($1300), Data Analyst ($1100), Marketing ($1000)
- **Hiring Modal**: Full-featured interface with category filtering and detailed personnel info
- **Financial Integration**: Hiring costs (5x salary) with capital validation
- **Personnel Management**: Fire personnel with proper cleanup of assignments

### ✅ Enhanced Training Course System (Sprint 2 - Completed)
- **15+ Predefined Courses**: Across 4 categories (Technical, Design, Management, Business)
- **Real-Time Individual Progress**: Each personnel has separate countdown timers with live updates
- **Game Speed Synchronization**: Course progress respects all speed multipliers (0.5x to 5x)
- **Seconds-Based Duration**: Courses use seconds (180s-360s) for engaging real-time progression
- **Course Categories**:
  - **Technical**: Programming Fundamentals (180s, $2000), Web Development Mastery (300s, $3800), App Development Specialist (360s, $4200)
  - **Design**: UI/UX Design Fundamentals (180s, $2500), Advanced Design Systems (240s, $4500)
  - **Management**: Project Management (180s, $3000), Agile & Scrum Mastery (120s, $2800)
  - **Business**: Digital Marketing (180s, $2400), Data Analysis & Insights (240s, $3300)
- **Project Creation Skills**: New skills (web-development, app-development, project-creation) enable creating projects
- **Context Menu Integration**: Personnel with skills can create websites and mobile apps via right-click
- **Enhanced InfoPanel**: Real-time progress bars, completion indicators, wider layout (384px)
- **Visual Feedback**: Progress bars turn green with "✅ Completed!" when finished
- **Progress Reset**: Personnel who leave courses early lose all progress
- **Pause/Resume Compatibility**: Course progress properly handles game state changes

### ✅ Task Management System (Sprint 3-8 - Completed)
- **Task Creation**: Complete framework for creating tasks with skill requirements
- **Task Assignment**: Full personnel assignment system with skill validation
- **Real-Time Progress**: Live task progress tracking with game speed synchronization
- **Multi-Personnel Tasks**: Support for complex tasks requiring multiple team members
- **Assignment Validation**: Prevents invalid assignments and double-booking conflicts

### ✅ Comprehensive Testing System (Sprint 9 - Completed)
- **Storybook Integration**: Production-ready testing environment at http://localhost:6006
- **80+ Test Scenarios**: Comprehensive coverage across all game mechanics
- **Interactive Testing**: Real-time component interaction and validation
- **Advanced Game Mechanics Testing**: Specialized tests for task assignment, course training, and investor systems
- **Visual Regression Testing**: Automated visual testing with Chromatic integration
- **Accessibility Testing**: Built-in a11y validation with axe-playwright
- **Performance Testing**: Large dataset and complex interaction testing
- **Mock Data System**: 100+ realistic test data objects for comprehensive scenarios

## 🚀 How to Play

### Getting Started
1. **Start the Game**: The game begins with your founder, an initial idea, and $50,000 capital
2. **Hire Personnel**: Right-click on empty space and select "Hire Personnel" to open the hiring modal
3. **Browse Personnel**: Filter by category (Developers, Designers, Managers, Specialists) and view detailed stats
4. **Create Courses**: Click the Course shop item (🎓) to open the course selection modal
5. **Enroll Personnel**: Drag personnel nodes onto course nodes to enroll them for training
6. **Manage Finances**: Watch your capital decrease as you hire personnel, create courses, and pay salaries each tick
7. **Fire Personnel**: Right-click on personnel nodes to fire them if needed

### Game Controls
- **Left-click nodes**: View detailed information in the InfoPanel
- **Right-click**: Open context menu for actions (hire, fire, create tasks)
- **Drag nodes**: Reposition elements on the graph
- **Drag personnel to courses**: Enroll personnel in training courses with visual grouping
- **Shop items**: Click shop buttons to create courses or other items
- **Game Controls**: Use bottom-left buttons to pause/resume and adjust game speed
- **Graph Controls**: Fit graph, re-layout, or center view using bottom-right buttons

### Financial Management
- **Starting Capital**: $50,000
- **Hiring Costs**: 5x the personnel's salary (one-time cost)
- **Course Costs**: Range from $2,000 to $3,800 depending on course complexity
- **Ongoing Expenses**: Personnel salaries deducted each game tick
- **Revenue**: Currently $0 (market system coming in future sprints)

## 🛠 Technical Stack

- **Frontend**: Svelte 5 with TypeScript
- **Styling**: Tailwind CSS 4
- **Graph Visualization**: Cytoscape.js with cytoscape-compound-drag-and-drop extension
- **State Management**: Svelte stores with reactive updates
- **Build Tool**: Vite
- **Package Manager**: npm

## 🚀 Getting Started (Development)

1. **Clone the repository**
2. **Install dependencies**: `npm install`
3. **Start development server**: `npm run dev`
4. **Open browser**: Navigate to `http://localhost:5173` (or the port shown in terminal)

### 🧪 Testing & Storybook

**Run Storybook for component testing:**
```bash
npm run storybook
```
- **Access Storybook**: http://localhost:6006
- **80+ Test Scenarios**: Comprehensive coverage of all game mechanics
- **Interactive Testing**: Real-time component interaction and validation
- **Visual Regression**: Automated visual testing with Chromatic
- **Accessibility Testing**: Built-in a11y validation

**Test Categories:**
- **Component Stories**: HUD, InfoPanel, ContextMenu, Shop, CytoscapeGraph
- **Game Mechanics**: Task assignment, course training, investor systems
- **Workflow Testing**: Complete user journeys and integration scenarios
- **Error Handling**: Edge cases, validation, and error recovery

## 🎯 Development Roadmap

### ✅ Sprints 1-9 (Completed)
- **Sprint 1-2**: Core infrastructure, personnel management, course system
- **Sprint 3-8**: Task management, marketing & CRM, HR system, real-time progress, UI/UX improvements, revenue generation
- **Sprint 9**: Comprehensive testing system with Storybook integration

### 🚀 Sprint 10 (Current) - Polish & User Experience
- **Visual Design**: Improved animations and polished UI
- **Game Tutorial**: Onboarding system for new players
- **Save/Load System**: Game state persistence between sessions
- **Achievement System**: Unlock achievements for milestones
- **Team Dynamics**: Personnel synergies and collaboration mechanics

### ⏳ Sprint 11 - Testing, Optimization & Release Prep
- **Unit Testing**: Core game logic test coverage >80%
- **Component Testing**: Svelte component integration tests
- **End-to-End Testing**: Critical user flow validation
- **Performance Optimization**: Smooth performance with 100+ nodes
- **Deployment Pipeline**: Automated builds and production deployment

## 📚 Documentation

- **[Game Concept](docs/concept.md)**: Detailed game design and mechanics
- **[Sprint Backlog](docs/backlog.md)**: Development progress and roadmap
- **[Architecture](docs/archtecture.md)**: Technical architecture and design patterns
- **[Current Implementation](docs/current-implementation.md)**: Detailed status of implemented features
- **[Training Course System](docs/training-course-system.md)**: Comprehensive guide to the enhanced course system
- **[Testing System](docs/testing-system.md)**: Complete testing documentation with Storybook integration

## 🎯 Current Project Status

**✅ Completed (Sprints 1-9):**
- **Core Infrastructure**: Interactive graph, game engine, UI framework, financial system
- **Personnel Management**: Hiring system with 12 templates, firing, financial integration
- **Course Training System**: 15+ courses, real-time progress, skill enhancement
- **Task Management**: Complete assignment system with skill validation and real-time progress
- **Marketing & CRM**: Customer segments, content creation, lead generation, conversion tracking
- **HR System**: Professional hiring interface with category filtering
- **Real-Time Progress**: Synchronized task and course progress with game speed
- **UI/UX Improvements**: Enhanced InfoPanel, visual consistency, node shape standardization
- **Revenue Generation**: Product sales system with market dynamics
- **Comprehensive Testing**: 80+ test scenarios, Storybook integration, accessibility testing

**🚀 Current Focus (Sprint 10):**
- **Polish & User Experience**: Visual improvements, animations, game tutorial
- **Save/Load System**: Game state persistence
- **Achievement System**: Milestone tracking and rewards
- **Team Dynamics**: Personnel synergies and collaboration

**⏳ Next Up (Sprint 11):**
- **Testing & Optimization**: Unit tests, performance optimization
- **Release Preparation**: Deployment pipeline, production configuration
