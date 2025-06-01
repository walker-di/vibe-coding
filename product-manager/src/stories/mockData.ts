import type { 
  BaseNodeData, 
  PersonnelData, 
  ProductData, 
  TaskData, 
  ResourceData, 
  IdeaData, 
  CourseData,
  EdgeData,
  MarketData,
  CustomerSegment,
  MarketingContent,
  Lead,
  Customer
} from '../types';

// Mock Personnel Data
export const mockPersonnelData: PersonnelData[] = [
  {
    id: 'personnel-1',
    type: 'Personnel',
    label: 'Alice Johnson',
    description: 'Senior Frontend Developer with React and Svelte expertise',
    cost: 8000,
    salary: 8000,
    skills: ['frontend-development', 'react', 'svelte', 'typescript'],
    efficiency: 1.2,
    actionPoints: 3,
    maxActionPoints: 3,
    category: 'Developer',
    experience: 'Senior',
    isAvailable: true,
    currentTaskId: null,
    currentCourseId: null,
    courseProgress: null,
    courseStartTime: null
  },
  {
    id: 'personnel-2',
    type: 'Personnel',
    label: 'Bob Smith',
    description: 'Backend Developer specializing in Node.js and databases',
    cost: 7500,
    salary: 7500,
    skills: ['backend-development', 'nodejs', 'databases', 'api-design'],
    efficiency: 1.1,
    actionPoints: 2,
    maxActionPoints: 3,
    category: 'Developer',
    experience: 'Mid-level',
    isAvailable: true,
    currentTaskId: 'task-1',
    currentCourseId: null,
    courseProgress: null,
    courseStartTime: null
  },
  {
    id: 'personnel-3',
    type: 'Personnel',
    label: 'Carol Davis',
    description: 'UX/UI Designer with expertise in user research and prototyping',
    cost: 6500,
    salary: 6500,
    skills: ['ui-design', 'ux-research', 'prototyping', 'figma'],
    efficiency: 1.0,
    actionPoints: 3,
    maxActionPoints: 3,
    category: 'Designer',
    experience: 'Mid-level',
    isAvailable: false,
    currentTaskId: null,
    currentCourseId: 'course-1',
    courseProgress: 65,
    courseStartTime: Date.now() - 65000
  }
];

// Mock Product Data
export const mockProductData: ProductData[] = [
  {
    id: 'product-1',
    type: 'Product',
    label: 'TaskMaster Pro',
    description: 'Advanced project management application with AI features',
    cost: 0,
    quality: 85,
    features: ['task-management', 'ai-assistance', 'team-collaboration', 'analytics'],
    marketValue: 50000,
    developmentProgress: 100,
    isCompleted: true,
    requiredSkills: ['frontend-development', 'backend-development', 'ui-design'],
    assignedPersonnelIds: []
  },
  {
    id: 'product-2',
    type: 'Product',
    label: 'Mobile Fitness App',
    description: 'Cross-platform fitness tracking application',
    cost: 0,
    quality: 60,
    features: ['workout-tracking', 'nutrition-logging', 'social-features'],
    marketValue: 30000,
    developmentProgress: 45,
    isCompleted: false,
    requiredSkills: ['mobile-development', 'ui-design', 'backend-development'],
    assignedPersonnelIds: ['personnel-1', 'personnel-2']
  }
];

// Mock Task Data
export const mockTaskData: TaskData[] = [
  {
    id: 'task-1',
    type: 'Task',
    label: 'Implement User Authentication',
    description: 'Add secure login and registration functionality',
    cost: 0,
    requiredSkills: ['backend-development', 'security'],
    assignedPersonnelIds: ['personnel-2'],
    progress: 75,
    isCompleted: false,
    estimatedDuration: 120, // 2 hours in minutes
    startTime: Date.now() - 90 * 60 * 1000, // Started 90 minutes ago
    remainingTime: 30 * 60 * 1000, // 30 minutes remaining
    outputs: ['authentication-system'],
    parentProductId: 'product-1'
  },
  {
    id: 'task-2',
    type: 'Task',
    label: 'Design Landing Page',
    description: 'Create an attractive and conversion-focused landing page',
    cost: 0,
    requiredSkills: ['ui-design', 'frontend-development'],
    assignedPersonnelIds: [],
    progress: 0,
    isCompleted: false,
    estimatedDuration: 180, // 3 hours
    startTime: null,
    remainingTime: null,
    outputs: ['landing-page-design'],
    parentProductId: 'product-2'
  }
];

// Mock Resource Data
export const mockResourceData: ResourceData[] = [
  {
    id: 'resource-1',
    type: 'Resource',
    label: 'Cloud Server Credits',
    description: 'AWS credits for hosting and development',
    cost: 500,
    quantity: 10,
    category: 'Infrastructure'
  },
  {
    id: 'resource-2',
    type: 'Resource',
    label: 'Design Software License',
    description: 'Adobe Creative Suite annual license',
    cost: 600,
    quantity: 3,
    category: 'Software'
  }
];

// Mock Idea Data
export const mockIdeaData: IdeaData[] = [
  {
    id: 'idea-1',
    type: 'Idea',
    label: 'AI-Powered Code Review Tool',
    description: 'Automated code review system using machine learning',
    cost: 0,
    marketPotential: 'High',
    complexity: 'High',
    requiredSkills: ['ai-development', 'backend-development', 'frontend-development'],
    estimatedDevelopmentTime: 6 // months
  },
  {
    id: 'idea-2',
    type: 'Idea',
    label: 'Local Food Delivery App',
    description: 'Hyperlocal food delivery platform for small restaurants',
    cost: 0,
    marketPotential: 'Medium',
    complexity: 'Medium',
    requiredSkills: ['mobile-development', 'backend-development', 'ui-design'],
    estimatedDevelopmentTime: 4 // months
  }
];

// Mock Course Data
export const mockCourseData: CourseData[] = [
  {
    id: 'course-1',
    type: 'Course',
    label: 'Advanced React Development',
    description: 'Master advanced React patterns and performance optimization',
    cost: 2500,
    duration: 300, // 5 minutes for demo
    category: 'Technical',
    skillsImproved: ['react', 'frontend-development', 'performance-optimization'],
    maxParticipants: 5,
    enrolledPersonnelIds: ['personnel-3'],
    isActive: true,
    isCompleted: false,
    startTime: Date.now() - 195000, // Started 3.25 minutes ago
    completionTime: null
  },
  {
    id: 'course-2',
    type: 'Course',
    label: 'UX Research Fundamentals',
    description: 'Learn user research methodologies and best practices',
    cost: 2000,
    duration: 240, // 4 minutes for demo
    category: 'Design',
    skillsImproved: ['ux-research', 'user-testing', 'data-analysis'],
    maxParticipants: 8,
    enrolledPersonnelIds: [],
    isActive: false,
    isCompleted: false,
    startTime: null,
    completionTime: null
  }
];

// Mock Edge Data
export const mockEdgeData: EdgeData[] = [
  {
    id: 'edge-1',
    source: 'personnel-1',
    target: 'product-2',
    type: 'assignment',
    label: 'Working on'
  },
  {
    id: 'edge-2',
    source: 'personnel-2',
    target: 'task-1',
    type: 'assignment',
    label: 'Assigned to'
  },
  {
    id: 'edge-3',
    source: 'idea-1',
    target: 'product-1',
    type: 'development',
    label: 'Developed into'
  }
];

// Mock Customer Segments
export const mockCustomerSegments: CustomerSegment[] = [
  {
    id: 'segment-1',
    name: 'Tech Enthusiasts',
    size: 15000,
    interests: ['technology', 'innovation', 'productivity'],
    demographics: { ageRange: '25-40', income: 'high', location: 'urban' },
    conversionRate: 0.08,
    lifetimeValue: 1200,
    preferredPlatforms: ['LinkedIn', 'YouTube'],
    contentAffinity: ['educational', 'technical']
  },
  {
    id: 'segment-2',
    name: 'Small Business Owners',
    size: 8000,
    interests: ['business-growth', 'efficiency', 'cost-saving'],
    demographics: { ageRange: '30-55', income: 'medium-high', location: 'mixed' },
    conversionRate: 0.12,
    lifetimeValue: 2500,
    preferredPlatforms: ['Facebook', 'LinkedIn'],
    contentAffinity: ['promotional', 'case-study']
  }
];

// Utility functions for generating random mock data
export function generateRandomPersonnel(count: number = 1): PersonnelData[] {
  const names = ['Alex', 'Jordan', 'Taylor', 'Casey', 'Morgan', 'Riley', 'Avery', 'Quinn'];
  const surnames = ['Johnson', 'Smith', 'Brown', 'Davis', 'Wilson', 'Miller', 'Moore', 'Taylor'];
  const categories = ['Developer', 'Designer', 'Manager', 'Specialist'];
  const experiences = ['Junior', 'Mid-level', 'Senior', 'Lead'];
  
  return Array.from({ length: count }, (_, i) => ({
    id: `personnel-${Date.now()}-${i}`,
    type: 'Personnel' as const,
    label: `${names[i % names.length]} ${surnames[i % surnames.length]}`,
    description: `Experienced ${categories[i % categories.length].toLowerCase()}`,
    cost: 5000 + Math.floor(Math.random() * 5000),
    salary: 5000 + Math.floor(Math.random() * 5000),
    skills: ['skill-1', 'skill-2'],
    efficiency: 0.8 + Math.random() * 0.4,
    actionPoints: Math.floor(Math.random() * 4),
    maxActionPoints: 3,
    category: categories[i % categories.length] as any,
    experience: experiences[i % experiences.length] as any,
    isAvailable: Math.random() > 0.3,
    currentTaskId: null,
    currentCourseId: null,
    courseProgress: null,
    courseStartTime: null
  }));
}

// Mock Investor Pitch Data
export const mockInvestorPitchData: any[] = [
  {
    id: 'pitch-1',
    type: 'InvestorPitch',
    label: 'Series A Pitch Deck',
    description: 'Professional pitch deck with strong financials and growth metrics',
    cost: 0,
    quality: 0.85,
    createdBy: 'personnel-1',
    creationTime: Date.now() - 300000, // Created 5 minutes ago
    presentedTo: [],
    isUsed: false
  },
  {
    id: 'pitch-2',
    type: 'InvestorPitch',
    label: 'Seed Funding Pitch',
    description: 'Basic pitch deck for early-stage funding',
    cost: 0,
    quality: 0.65,
    createdBy: 'personnel-2',
    creationTime: Date.now() - 600000, // Created 10 minutes ago
    presentedTo: ['angel-1'],
    isUsed: false
  }
];

// Mock Angel Investor Data
export const mockAngelInvestorData: any[] = [
  {
    id: 'angel-1',
    type: 'AngelFounder',
    label: 'Michael Tech Angel',
    description: 'Tech-focused angel investor with startup experience',
    cost: 0,
    investmentAmount: 500000,
    equityRequirement: 15,
    requirements: ['proven-revenue', 'tech-product', 'scalable-model'],
    isAvailable: true,
    pitchId: null
  },
  {
    id: 'angel-2',
    type: 'AngelFounder',
    label: 'Lisa Venture Capital',
    description: 'Venture capitalist interested in growth-stage companies',
    cost: 0,
    investmentAmount: 1000000,
    equityRequirement: 25,
    requirements: ['growth-metrics', 'market-validation', 'experienced-team'],
    isAvailable: true,
    pitchId: null
  }
];

// Mock Assignment Task Data
export const mockAssignmentTaskData: any[] = [
  {
    id: 'task-assignment-1',
    type: 'Task',
    label: 'Frontend Development',
    description: 'Build responsive user interface components',
    cost: 0,
    requiredSkills: ['frontend-development', 'react'],
    assignedPersonnelIds: [],
    progress: 0,
    isCompleted: false,
    estimatedDuration: 240, // 4 hours
    startTime: null,
    remainingTime: null,
    outputs: ['ui-components'],
    parentProductId: 'product-1'
  },
  {
    id: 'task-assignment-2',
    type: 'Task',
    label: 'API Development',
    description: 'Create RESTful API endpoints with authentication',
    cost: 0,
    requiredSkills: ['backend-development', 'api-design'],
    assignedPersonnelIds: ['personnel-2'],
    progress: 45,
    isCompleted: false,
    estimatedDuration: 360, // 6 hours
    startTime: Date.now() - 162000, // Started 2.7 hours ago
    remainingTime: 198000, // 3.3 hours remaining
    outputs: ['api-endpoints'],
    parentProductId: 'product-1'
  }
];

// Enhanced Course Data with Individual Progress
export const mockEnhancedCourseData: any[] = [
  {
    id: 'course-enhanced-1',
    type: 'Course',
    label: 'Advanced React Development',
    description: 'Master advanced React patterns, hooks, and performance optimization',
    courseTemplateId: 'react-advanced',
    skillsImproved: ['react', 'frontend-development', 'performance-optimization'],
    efficiencyBoost: 0.2,
    duration: 300, // 5 minutes for demo
    cost: 2500,
    category: 'technical',
    maxParticipants: 5,
    enrolledPersonnelIds: ['personnel-3'],
    personnelProgress: {
      'personnel-3': {
        startTime: Date.now() - 195000, // Started 3.25 minutes ago
        remainingTime: 105000 // 1.75 minutes remaining
      }
    },
    isActive: true,
    isCompleted: false
  },
  {
    id: 'course-enhanced-2',
    type: 'Course',
    label: 'Leadership & Management',
    description: 'Develop leadership skills and team management capabilities',
    courseTemplateId: 'leadership-basics',
    skillsImproved: ['leadership', 'team-management', 'communication'],
    efficiencyBoost: 0.25,
    duration: 360, // 6 minutes for demo
    cost: 3000,
    category: 'management',
    maxParticipants: 3,
    enrolledPersonnelIds: ['personnel-1', 'personnel-2'],
    personnelProgress: {
      'personnel-1': {
        startTime: Date.now() - 120000, // Started 2 minutes ago
        remainingTime: 240000 // 4 minutes remaining
      },
      'personnel-2': {
        startTime: Date.now() - 180000, // Started 3 minutes ago
        remainingTime: 180000 // 3 minutes remaining
      }
    },
    isActive: true,
    isCompleted: false
  }
];

// Game state mock data
export const mockGameState = {
  nodes: [
    ...mockPersonnelData,
    ...mockProductData,
    ...mockTaskData,
    ...mockResourceData,
    ...mockIdeaData,
    ...mockCourseData,
    ...mockInvestorPitchData,
    ...mockAngelInvestorData,
    ...mockAssignmentTaskData,
    ...mockEnhancedCourseData
  ],
  edges: mockEdgeData,
  finances: {
    capital: 45000,
    totalRevenue: 15000,
    totalExpenses: 20000,
    netProfit: -5000
  },
  currentTick: 42,
  gameSpeed: 1.0,
  isPaused: false
};

// Enhanced game state for testing scenarios
export const mockEnhancedGameState = {
  ...mockGameState,
  nodes: [
    ...mockGameState.nodes,
    // Additional test scenarios
    {
      id: 'personnel-ceo-test',
      type: 'Personnel',
      label: 'CEO Test User',
      description: 'CEO with all business skills for testing',
      cost: 15000,
      salary: 15000,
      skills: ['leadership', 'business-development', 'pitch-creation', 'strategy', 'negotiation'],
      efficiency: 1.5,
      actionPoints: 3,
      maxActionPoints: 3,
      category: 'Manager',
      experience: 'Senior',
      isAvailable: true,
      assignedToTaskId: null,
      currentCourseId: null,
      courseProgress: null,
      courseStartTime: null
    }
  ]
};
