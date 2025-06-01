// Course templates for personnel training

export interface CourseTemplate {
    id: string;
    label: string;
    description: string;
    skillsImproved: string[];
    efficiencyBoost: number; // Amount to increase efficiency (0-0.3)
    duration: number; // Duration in ticks (weeks)
    cost: number;
    category: 'technical' | 'design' | 'management' | 'business';
    prerequisites?: string[]; // Required skills to take the course
    maxParticipants: number; // Maximum personnel that can take this course at once
}

export const courseTemplates: CourseTemplate[] = [
    // Technical Courses
    {
        id: 'programming-fundamentals',
        label: 'Programming Fundamentals',
        description: 'Learn the basics of programming and software development',
        skillsImproved: ['programming', 'debugging'],
        efficiencyBoost: 0.15,
        duration: 3,
        cost: 2000,
        category: 'technical',
        maxParticipants: 5
    },
    {
        id: 'advanced-programming',
        label: 'Advanced Programming',
        description: 'Master advanced programming concepts and patterns',
        skillsImproved: ['programming', 'architecture', 'debugging'],
        efficiencyBoost: 0.2,
        duration: 4,
        cost: 4000,
        category: 'technical',
        prerequisites: ['programming'],
        maxParticipants: 3
    },
    {
        id: 'mobile-development',
        label: 'Mobile Development',
        description: 'Learn to develop mobile applications for iOS and Android',
        skillsImproved: ['mobile development', 'programming', 'ui design'],
        efficiencyBoost: 0.18,
        duration: 4,
        cost: 3500,
        category: 'technical',
        prerequisites: ['programming'],
        maxParticipants: 4
    },
    {
        id: 'devops-training',
        label: 'DevOps & Infrastructure',
        description: 'Master deployment, automation, and infrastructure management',
        skillsImproved: ['devops', 'infrastructure', 'automation'],
        efficiencyBoost: 0.2,
        duration: 3,
        cost: 3000,
        category: 'technical',
        maxParticipants: 3
    },

    // Design Courses
    {
        id: 'ui-ux-fundamentals',
        label: 'UI/UX Design Fundamentals',
        description: 'Learn the principles of user interface and experience design',
        skillsImproved: ['ui design', 'ux research', 'prototyping'],
        efficiencyBoost: 0.15,
        duration: 3,
        cost: 2500,
        category: 'design',
        maxParticipants: 4
    },
    {
        id: 'advanced-design',
        label: 'Advanced Design Systems',
        description: 'Master design systems, accessibility, and advanced UX principles',
        skillsImproved: ['ui design', 'ux research', 'prototyping', 'branding'],
        efficiencyBoost: 0.22,
        duration: 4,
        cost: 4500,
        category: 'design',
        prerequisites: ['ui design'],
        maxParticipants: 3
    },
    {
        id: 'graphic-design',
        label: 'Graphic Design & Branding',
        description: 'Learn visual design, branding, and marketing materials creation',
        skillsImproved: ['graphic design', 'branding', 'marketing'],
        efficiencyBoost: 0.16,
        duration: 3,
        cost: 2200,
        category: 'design',
        maxParticipants: 4
    },

    // Management Courses
    {
        id: 'project-management',
        label: 'Project Management',
        description: 'Learn to effectively manage projects, teams, and timelines',
        skillsImproved: ['project management', 'leadership', 'planning'],
        efficiencyBoost: 0.18,
        duration: 3,
        cost: 3000,
        category: 'management',
        maxParticipants: 5
    },
    {
        id: 'agile-scrum',
        label: 'Agile & Scrum Mastery',
        description: 'Master agile methodologies and scrum framework',
        skillsImproved: ['project management', 'leadership', 'planning', 'mentoring'],
        efficiencyBoost: 0.2,
        duration: 2,
        cost: 2800,
        category: 'management',
        prerequisites: ['project management'],
        maxParticipants: 6
    },
    {
        id: 'team-leadership',
        label: 'Team Leadership',
        description: 'Develop leadership skills and team management capabilities',
        skillsImproved: ['leadership', 'mentoring', 'planning'],
        efficiencyBoost: 0.17,
        duration: 3,
        cost: 3200,
        category: 'management',
        maxParticipants: 4
    },

    // Business Courses
    {
        id: 'digital-marketing',
        label: 'Digital Marketing',
        description: 'Learn modern digital marketing strategies and tools',
        skillsImproved: ['marketing', 'social media', 'content creation', 'analytics'],
        efficiencyBoost: 0.16,
        duration: 3,
        cost: 2400,
        category: 'business',
        maxParticipants: 5
    },
    {
        id: 'data-analysis',
        label: 'Data Analysis & Insights',
        description: 'Master data analysis, statistics, and business intelligence',
        skillsImproved: ['data analysis', 'statistics', 'reporting', 'analytics'],
        efficiencyBoost: 0.19,
        duration: 4,
        cost: 3300,
        category: 'business',
        maxParticipants: 4
    },
    {
        id: 'product-strategy',
        label: 'Product Strategy',
        description: 'Learn product management, market research, and strategy development',
        skillsImproved: ['product management', 'market research', 'strategy', 'planning'],
        efficiencyBoost: 0.21,
        duration: 4,
        cost: 4200,
        category: 'business',
        maxParticipants: 3
    },
    {
        id: 'quality-assurance',
        label: 'Quality Assurance',
        description: 'Master testing methodologies and quality control processes',
        skillsImproved: ['testing', 'quality assurance', 'debugging'],
        efficiencyBoost: 0.15,
        duration: 2,
        cost: 2000,
        category: 'technical',
        maxParticipants: 5
    }
];

// Helper functions
export function getCoursesByCategory(category: CourseTemplate['category']): CourseTemplate[] {
    return courseTemplates.filter(course => course.category === category);
}

export function getCourseById(id: string): CourseTemplate | undefined {
    return courseTemplates.find(course => course.id === id);
}

export function getAvailableCoursesForPersonnel(personnelSkills: string[]): CourseTemplate[] {
    return courseTemplates.filter(course => {
        // If course has prerequisites, check if personnel has them
        if (course.prerequisites && course.prerequisites.length > 0) {
            return course.prerequisites.every(prereq => personnelSkills.includes(prereq));
        }
        return true;
    });
}

export function calculateCourseValue(course: CourseTemplate): number {
    // Calculate value based on efficiency boost, duration, and skills improved
    const skillsValue = course.skillsImproved.length * 100;
    const efficiencyValue = course.efficiencyBoost * 1000;
    const durationPenalty = course.duration * 50;
    return skillsValue + efficiencyValue - durationPenalty;
}
