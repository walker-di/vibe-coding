// Predefined personnel templates for hiring

export interface PersonnelTemplate {
    label: string;
    description: string;
    skills: string[];
    efficiency: number;
    morale: number;
    salary: number;
    category: 'developer' | 'designer' | 'manager' | 'specialist';
}

export const personnelTemplates: PersonnelTemplate[] = [
    // Developers
    {
        label: 'Junior Developer',
        description: 'Entry-level developer with basic programming skills',
        skills: ['programming', 'debugging'],
        efficiency: 0.6,
        morale: 0.9,
        salary: 800,
        category: 'developer'
    },
    {
        label: 'Senior Developer',
        description: 'Experienced developer with advanced technical skills',
        skills: ['programming', 'debugging', 'architecture', 'mentoring'],
        efficiency: 0.9,
        morale: 0.8,
        salary: 1500,
        category: 'developer'
    },
    {
        label: 'Full-Stack Developer',
        description: 'Versatile developer skilled in both frontend and backend',
        skills: ['programming', 'frontend', 'backend', 'databases'],
        efficiency: 0.8,
        morale: 0.8,
        salary: 1200,
        category: 'developer'
    },
    {
        label: 'Mobile Developer',
        description: 'Specialist in mobile app development',
        skills: ['mobile development', 'programming', 'ui design'],
        efficiency: 0.8,
        morale: 0.8,
        salary: 1100,
        category: 'developer'
    },

    // Designers
    {
        label: 'UI/UX Designer',
        description: 'Creative professional focused on user experience',
        skills: ['ui design', 'ux research', 'prototyping'],
        efficiency: 0.8,
        morale: 0.9,
        salary: 1000,
        category: 'designer'
    },
    {
        label: 'Graphic Designer',
        description: 'Visual designer for marketing and branding',
        skills: ['graphic design', 'branding', 'marketing'],
        efficiency: 0.7,
        morale: 0.9,
        salary: 900,
        category: 'designer'
    },

    // Managers
    {
        label: 'Project Manager',
        description: 'Organizes teams and manages project timelines',
        skills: ['project management', 'leadership', 'planning'],
        efficiency: 0.7,
        morale: 0.8,
        salary: 1300,
        category: 'manager'
    },
    {
        label: 'Product Manager',
        description: 'Defines product strategy and requirements',
        skills: ['product management', 'market research', 'strategy'],
        efficiency: 0.8,
        morale: 0.8,
        salary: 1400,
        category: 'manager'
    },

    // Specialists
    {
        label: 'QA Tester',
        description: 'Quality assurance specialist for testing products',
        skills: ['testing', 'quality assurance', 'debugging'],
        efficiency: 0.8,
        morale: 0.8,
        salary: 900,
        category: 'specialist'
    },
    {
        label: 'DevOps Engineer',
        description: 'Infrastructure and deployment specialist',
        skills: ['devops', 'infrastructure', 'automation'],
        efficiency: 0.8,
        morale: 0.7,
        salary: 1300,
        category: 'specialist'
    },
    {
        label: 'Data Analyst',
        description: 'Analyzes data to provide business insights',
        skills: ['data analysis', 'statistics', 'reporting'],
        efficiency: 0.8,
        morale: 0.8,
        salary: 1100,
        category: 'specialist'
    },
    {
        label: 'Marketing Specialist',
        description: 'Promotes products and manages marketing campaigns',
        skills: ['marketing', 'social media', 'content creation'],
        efficiency: 0.7,
        morale: 0.9,
        salary: 1000,
        category: 'specialist'
    }
];

// Helper function to get templates by category
export function getPersonnelByCategory(category: PersonnelTemplate['category']): PersonnelTemplate[] {
    return personnelTemplates.filter(template => template.category === category);
}

// Helper function to get random personnel template
export function getRandomPersonnelTemplate(): PersonnelTemplate {
    return personnelTemplates[Math.floor(Math.random() * personnelTemplates.length)];
}

// Helper function to calculate hiring cost
export function calculateHiringCost(template: PersonnelTemplate): number {
    return template.salary * 5; // 5 ticks worth of salary as hiring cost
}
