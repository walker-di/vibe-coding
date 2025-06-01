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

### 🔄 Task Management (Sprint 2 - In Progress)
- **Task Creation**: Basic framework for creating tasks with skill requirements
- **Task Assignment**: Foundation for assigning personnel to tasks (in development)

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

## 🎯 Development Roadmap

### Sprint 2 (Current) - Game Mechanics & Node Interactions
- ✅ Personnel hiring and management systems
- ✅ Course system with compound drag-and-drop functionality
- 🔄 Task creation and assignment workflows
- ⏳ Product development from ideas to market
- ⏳ Basic market system for product sales
- ⏳ Advanced node combination mechanics

### Sprint 3 - Advanced Features & Polish
- Market demand fluctuation and competition
- Resource management and consumption
- Personnel training and specialization
- Visual improvements and animations
- Achievement system and difficulty scaling

## 📚 Documentation

- **[Game Concept](docs/concept.md)**: Detailed game design and mechanics
- **[Sprint Backlog](docs/backlog.md)**: Development progress and roadmap
- **[Architecture](docs/archtecture.md)**: Technical architecture and design patterns
- **[Current Implementation](docs/current-implementation.md)**: Detailed status of implemented features
- **[Training Course System](docs/training-course-system.md)**: Comprehensive guide to the enhanced course system

## 🎯 Current Sprint 2 Status

**Completed:**
- ✅ Personnel hiring system with 12 templates
- ✅ Hiring modal with category filtering
- ✅ Personnel firing with proper cleanup
- ✅ Financial integration and validation
- ✅ Context menu integration
- ✅ Course system with 15+ predefined courses
- ✅ Course modal with category filtering
- ✅ Compound drag-and-drop for personnel enrollment
- ✅ Automatic course progression and completion
- ✅ Skill enhancement and efficiency boosts

**In Progress:**
- 🔄 Task creation and assignment system
- 🔄 Personnel skill matching for tasks

**Next Up:**
- ⏳ Product development workflow
- ⏳ Basic market system
- ⏳ Node combination mechanics
