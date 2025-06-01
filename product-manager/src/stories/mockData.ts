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

// Game state mock data
export const mockGameState = {
  nodes: [
    ...mockPersonnelData,
    ...mockProductData,
    ...mockTaskData,
    ...mockResourceData,
    ...mockIdeaData,
    ...mockCourseData
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
