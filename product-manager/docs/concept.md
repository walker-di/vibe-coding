# ProductGraphTycoon - Game Concept

ProductGraphTycoon is a business simulation game where players build and manage a product development company using an interactive node-based graph interface. The game combines strategic business management with visual graph manipulation mechanics.

## Core Gameplay

### Node-Based Business Management
- **Interactive Graph Interface**: All business entities are represented as nodes in a visual graph (Personnel, Products, Tasks, Resources, Markets, Ideas)
- **Drag-and-Drop Interactions**: Players combine nodes by dragging them together to create relationships and trigger business actions
- **Real-Time Simulation**: The business operates in real-time with a tick-based system, allowing players to pause and adjust strategy

### Business Entity Types
- **Personnel Nodes**: Employees with skills, efficiency ratings, and salaries
- **Product Nodes**: Items being developed with quality metrics and feature sets
- **Task Nodes**: Work assignments that require specific skills and resources
- **Resource Nodes**: Capital, materials, and tools needed for operations
- **Market Nodes**: Customer segments with demand patterns and competition levels
- **Idea Nodes**: Concepts that can be developed into products or improvements

## Game Mechanics

### Personnel Management
- **Hiring**: Recruit employees with different skill sets and salary requirements
- **Skill Matching**: Assign personnel to tasks that match their expertise for optimal efficiency
- **Morale System**: Employee satisfaction affects productivity and retention
- **Training**: Improve employee skills over time through development programs

### Product Development Workflow
- **Idea Generation**: Start with concept nodes that represent potential products
- **Task Creation**: Break down development into specific work assignments
- **Resource Allocation**: Assign personnel and materials to development tasks
- **Quality Control**: Product quality depends on personnel skills and time invested
- **Market Launch**: Release products to target markets for revenue generation

### Financial Management
- **Capital Management**: Track company funds, revenue, and expenses
- **Salary Payments**: Personnel require regular compensation
- **Resource Costs**: Materials and tools have acquisition costs
- **Revenue Streams**: Products generate income based on market demand and quality
- **Investment Decisions**: Choose where to allocate limited resources for maximum return

## Game Features

### Visual Design
- **Node-Based Graph**: Clean, modern interface using Cytoscape.js for graph visualization
- **Color-Coded Entities**: Different node types have distinct visual styles and colors
- **Interactive Animations**: Smooth transitions and feedback for user interactions
- **Responsive Layout**: Automatic graph layout with manual positioning options

### User Experience
- **Real-Time with Pause**: Game progresses in real-time but can be paused for strategic planning
- **Drag-and-Drop Interface**: Intuitive node manipulation for creating business relationships
- **Context Menus**: Right-click actions for quick access to common operations
- **Information Panels**: Detailed views of selected nodes with relevant metrics

### Progression System
- **Skill Development**: Personnel improve over time through experience and training
- **Market Evolution**: Markets change demand patterns and introduce new opportunities
- **Technology Advancement**: Unlock new product categories and development techniques
- **Company Growth**: Scale from startup to enterprise with increasing complexity

## Key Challenges

### Strategic Decision Making
- **Resource Allocation**: Balance between hiring, development, and market expansion
- **Timing**: Decide when to launch products, hire personnel, or enter new markets
- **Risk Management**: Handle market volatility and personnel turnover

### Operational Efficiency
- **Workflow Optimization**: Design efficient development pipelines
- **Personnel Management**: Keep employees motivated and productive
- **Quality vs. Speed**: Balance product quality with time-to-market pressures

## Current Implementation Status

✅ **Sprint 1 Completed** - Foundation & Core Infrastructure
- Complete project setup with Svelte 5, TypeScript, Tailwind CSS 4, and Cytoscape.js
- Full-featured game engine with state management and tick system
- Interactive graph visualization with node selection and context menus
- Comprehensive UI framework with HUD, InfoPanel, and game controls
- Initial game state with Founder, Mobile App Idea, and Initial Capital

🚀 **Sprint 2 In Progress** - Game Mechanics & Node Interactions

### ✅ Personnel Hiring System (Completed)
- **Hiring Modal**: Full-featured interface with 12 personnel templates across 4 categories
- **Personnel Templates**: Developers, Designers, Managers, and Specialists with unique skills and costs
- **Financial Integration**: Hiring costs (5x salary) deducted from company capital
- **Context Menu Integration**: Right-click hiring and firing functionality
- **Validation System**: Prevents hiring without sufficient capital
- **Real-time Updates**: Immediate UI updates and financial tracking

### 🎯 Next Sprint 2 Features
- Task creation and assignment workflows
- Personnel skill matching for optimal efficiency
- Product development from ideas to market
- Basic market system for product sales
- Advanced node combination mechanics

### Available Personnel Types
- **Developers**: Junior ($800), Senior ($1500), Full-Stack ($1200), Mobile ($1100)
- **Designers**: UI/UX ($1000), Graphic ($900)
- **Managers**: Project ($1300), Product ($1400)
- **Specialists**: QA ($900), DevOps ($1300), Data Analyst ($1100), Marketing ($1000)

### Current Gameplay Features
- **Interactive Graph**: Click nodes for details, right-click for actions
- **Personnel Management**: Hire from 12 templates, fire existing personnel
- **Financial System**: Track capital, revenue, expenses with real-time updates
- **Game Controls**: Pause/resume, speed adjustment (0.5x to 3x)
- **Visual Feedback**: Color-coded nodes, smooth animations, responsive layout

ProductGraphTycoon aims to provide an engaging business simulation experience that combines strategic depth with intuitive visual interaction, making complex business concepts accessible through innovative graph-based gameplay.