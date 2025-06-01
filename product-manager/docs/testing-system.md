# Testing System Documentation

## Overview

ProductGraphTycoon features a comprehensive testing system built with Storybook 9, providing extensive coverage for all game mechanics, components, and user workflows. The testing system ensures reliable functionality, visual consistency, and accessibility compliance.

## 🚀 Quick Start

### Running Storybook
```bash
npm run storybook
```
Access the testing environment at: **http://localhost:6006**

### Running Tests
```bash
npm run test-storybook
```

## 📊 Testing Coverage

### Metrics
- **Total Story Files**: 11 comprehensive test files
- **Total Story Variations**: 80+ individual test scenarios
- **Test Coverage Areas**: 15+ major game mechanics
- **Integration Scenarios**: 10+ complete workflow tests
- **Error Scenarios**: 20+ edge cases and error conditions
- **Mock Data Entities**: 100+ realistic test data objects

## 🧪 Test Categories

### Core Component Testing

#### HUD Component (`HUD.stories.svelte`)
- Financial display accuracy
- Game controls functionality
- Speed settings validation
- HR section integration
- Real-time updates

#### InfoPanel Component (`InfoPanel.stories.svelte`)
- Node selection and display
- Task progress visualization
- Personnel details rendering
- Course enrollment information
- Real-time progress updates

#### ContextMenu Component (`ContextMenu.stories.svelte`)
- Different node type actions
- Available actions validation
- Disabled state handling
- Action execution testing

#### Shop Component (`Shop.stories.svelte`)
- Item availability checking
- Affordability validation
- Purchase interaction testing
- Category filtering

#### CytoscapeGraph Component (`CytoscapeGraph.stories.svelte`)
- Node rendering accuracy
- Interaction responsiveness
- Drag-and-drop functionality
- Zoom and pan controls

### Advanced Game Mechanics Testing

#### Task Assignment System (`TaskAssignment.stories.svelte`)
**6 comprehensive stories covering:**
- **Valid Assignment Scenarios**: Personnel with matching skills assigned to appropriate tasks
- **Skill Mismatch Testing**: Error handling when personnel lack required skills
- **Already Assigned Personnel**: Prevention of double-assignment conflicts
- **Task Progress Visualization**: Real-time progress tracking and timer displays
- **Multi-Personnel Assignment**: Complex tasks requiring multiple team members
- **Assignment with InfoPanel**: Integration testing with detailed information display

#### Course Training System (`CourseSystem.stories.svelte`)
**8 comprehensive stories covering:**
- **Course Enrollment**: Drag-and-drop personnel onto available courses
- **Active Course Progress**: Individual progress tracking with real-time updates
- **Multi-Personnel Courses**: Multiple personnel in same course with separate timers
- **Course Capacity Limits**: Maximum participant enforcement and error handling
- **Course Completion**: Skill gains and efficiency boosts upon completion
- **Course Prerequisites**: Skill requirement validation before enrollment
- **Course with InfoPanel**: Detailed course information and progress display
- **Course Modal Integration**: Course creation and template selection

#### Investor System Testing (`InvestorSystem.stories.svelte`)
**8 comprehensive stories covering:**
- **Pitch Creation Process**: Personnel assignment to pitch creation tasks
- **Pitch Development Progress**: Real-time progress tracking for pitch tasks
- **Pitch Quality Comparison**: Different quality levels and success rates
- **Angel Investor Interaction**: Drag-and-drop pitch presentation to investors
- **Successful Funding Flow**: Complete funding acquisition workflow
- **Funding Requirements**: Investor-specific requirements and validation
- **Finance Modal Integration**: Funding options and investor discovery
- **Complete Investor Workflow**: End-to-end funding acquisition process

#### Simplified Workflow Testing (`WorkflowTesting.stories.svelte`)
**6 streamlined stories covering:**
- **Assignment Workflow**: Basic task assignment validation
- **Course Training Workflow**: Personnel enrollment and skill development
- **Skill Development Pipeline**: Training → skill acquisition → task assignment
- **Multi-System Integration**: Cross-system dependencies and workflows
- **Error Handling Scenarios**: Invalid assignments, capacity limits, conflicts
- **Performance Testing**: Large datasets and complex interactions

### Game State Testing

#### Initial Game State
- Fresh game with starter nodes
- Proper initialization of all systems
- Default financial state validation

#### Mid-Game State
- Multiple personnel management
- Ongoing tasks and courses
- Complex node interactions

#### Advanced State
- Large-scale operations
- Marketing campaigns
- Customer base management

#### Edge Cases
- No money scenarios
- No personnel situations
- Completed courses handling
- Failed task recovery

## 🎮 Interactive Testing Features

### Real-Time Interaction
- **Drag-and-Drop Testing**: Validate all drag-and-drop interactions
- **Click Event Testing**: Verify node selection and context menus
- **Progress Tracking**: Real-time progress updates and synchronization
- **State Changes**: Game speed, pause/resume, and state transitions

### Visual Validation
- **Component Rendering**: Accurate visual representation
- **Progress Indicators**: Progress bars, timers, and completion states
- **Error States**: Visual feedback for invalid operations
- **Responsive Design**: Mobile and desktop viewport testing

### Accessibility Testing
- **Keyboard Navigation**: Tab order and focus management
- **Screen Reader Support**: ARIA labels and semantic HTML
- **Color Contrast**: High contrast and colorblind accessibility
- **Motor Accessibility**: Large click targets and reduced motion

## 🔧 Mock Data System

### Comprehensive Test Data
- **Personnel Data**: 12+ personnel templates with varied skills and experience
- **Task Data**: Complex tasks with different skill requirements
- **Course Data**: 15+ courses across 4 categories
- **Investor Data**: Angel investors with different investment criteria
- **Game State Data**: Complete game scenarios for testing

### Realistic Scenarios
- **Early Game**: Limited resources and personnel
- **Growth Phase**: Expanding team and operations
- **Mature Company**: Complex operations and investments
- **Crisis Situations**: Resource constraints and conflicts

## 📈 Performance Testing

### Large Dataset Testing
- **100+ Nodes**: Performance with large node networks
- **Real-Time Updates**: High-frequency state changes
- **Memory Usage**: Long-running scenario testing
- **Interaction Responsiveness**: Click, drag, and scroll performance

### Optimization Validation
- **Rendering Performance**: Smooth graph interactions
- **State Update Efficiency**: Reactive update performance
- **Memory Management**: Leak detection and cleanup
- **Bundle Size**: Asset optimization validation

## 🚨 Error Handling Testing

### Validation Scenarios
- **Invalid Assignments**: Personnel without required skills
- **Capacity Limits**: Course and task capacity enforcement
- **Resource Constraints**: Insufficient capital scenarios
- **Conflict Resolution**: Double-booking and assignment conflicts

### Recovery Testing
- **Error Recovery**: Graceful handling of invalid operations
- **State Consistency**: Maintaining valid game state
- **User Feedback**: Clear error messages and guidance
- **Rollback Mechanisms**: Undoing invalid operations

## 🔄 Continuous Integration

### Automated Testing
- **Visual Regression**: Chromatic integration for visual testing
- **Accessibility Validation**: Automated a11y testing with axe-playwright
- **Performance Monitoring**: Automated performance benchmarking
- **Cross-Browser Testing**: Multi-browser compatibility validation

### Quality Assurance
- **Code Coverage**: Comprehensive test coverage metrics
- **Documentation**: Living documentation with interactive examples
- **Best Practices**: Testing guidelines and standards
- **Team Collaboration**: Shared understanding of system behavior

## 📚 Testing Guidelines

### Writing New Tests
1. **Follow Naming Conventions**: Use descriptive story names
2. **Include Documentation**: Add descriptions and usage examples
3. **Test Edge Cases**: Include error scenarios and boundary conditions
4. **Validate Interactions**: Test all user interactions and workflows
5. **Mock Data**: Use realistic test data for accurate scenarios

### Maintaining Tests
1. **Regular Updates**: Keep tests synchronized with feature changes
2. **Performance Monitoring**: Watch for test performance degradation
3. **Documentation Updates**: Maintain accurate test documentation
4. **Coverage Analysis**: Ensure comprehensive test coverage
5. **Accessibility Compliance**: Validate accessibility requirements

This comprehensive testing system ensures ProductGraphTycoon maintains high quality, reliability, and user experience standards throughout development and beyond.
