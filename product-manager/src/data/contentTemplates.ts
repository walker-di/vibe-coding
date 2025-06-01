// Content templates for marketing campaigns

export interface ContentTemplate {
    id: string;
    label: string;
    description: string;
    contentType: 'post' | 'video' | 'article' | 'story' | 'reel';
    platforms: ('instagram' | 'facebook' | 'youtube' | 'linkedin' | 'tiktok')[];
    targetSegments: string[]; // Population segment IDs this content appeals to
    baseCost: number; // Cost to create this content
    baseQuality: number; // Base quality (0-1), can be improved by personnel skills
    requiredSkills: string[]; // Skills needed to create this content
    estimatedReach: number; // Expected reach per platform
    engagementRate: number; // Expected engagement rate (0-1)
    leadConversionRate: number; // Expected lead generation rate (0-1)
    category: 'educational' | 'promotional' | 'entertainment' | 'behind-the-scenes' | 'testimonial';
}

export const contentTemplates: ContentTemplate[] = [
    // Instagram Content
    {
        id: 'instagram-product-showcase',
        label: 'Product Showcase Post',
        description: 'High-quality images showcasing product features',
        contentType: 'post',
        platforms: ['instagram', 'facebook'],
        targetSegments: ['young-professionals', 'entrepreneurs'],
        baseCost: 200,
        baseQuality: 0.7,
        requiredSkills: ['marketing', 'graphic design'],
        estimatedReach: 1000,
        engagementRate: 0.05,
        leadConversionRate: 0.02,
        category: 'promotional'
    },
    {
        id: 'instagram-behind-scenes',
        label: 'Behind the Scenes Story',
        description: 'Show the team working and company culture',
        contentType: 'story',
        platforms: ['instagram'],
        targetSegments: ['young-professionals', 'students'],
        baseCost: 100,
        baseQuality: 0.6,
        requiredSkills: ['marketing', 'content creation'],
        estimatedReach: 500,
        engagementRate: 0.08,
        leadConversionRate: 0.01,
        category: 'behind-the-scenes'
    },
    {
        id: 'instagram-tutorial-reel',
        label: 'Tutorial Reel',
        description: 'Quick tutorial showing how to use the product',
        contentType: 'reel',
        platforms: ['instagram', 'tiktok'],
        targetSegments: ['students', 'young-professionals'],
        baseCost: 300,
        baseQuality: 0.8,
        requiredSkills: ['marketing', 'video editing', 'content creation'],
        estimatedReach: 2000,
        engagementRate: 0.12,
        leadConversionRate: 0.04,
        category: 'educational'
    },

    // YouTube Content
    {
        id: 'youtube-product-demo',
        label: 'Product Demo Video',
        description: 'Comprehensive product demonstration and walkthrough',
        contentType: 'video',
        platforms: ['youtube'],
        targetSegments: ['entrepreneurs', 'professionals'],
        baseCost: 800,
        baseQuality: 0.9,
        requiredSkills: ['marketing', 'video editing', 'presentation'],
        estimatedReach: 5000,
        engagementRate: 0.06,
        leadConversionRate: 0.08,
        category: 'educational'
    },
    {
        id: 'youtube-customer-testimonial',
        label: 'Customer Success Story',
        description: 'Interview with satisfied customers sharing their experience',
        contentType: 'video',
        platforms: ['youtube', 'linkedin'],
        targetSegments: ['entrepreneurs', 'professionals'],
        baseCost: 600,
        baseQuality: 0.85,
        requiredSkills: ['marketing', 'video editing', 'interviewing'],
        estimatedReach: 3000,
        engagementRate: 0.04,
        leadConversionRate: 0.06,
        category: 'testimonial'
    },

    // LinkedIn Content
    {
        id: 'linkedin-thought-leadership',
        label: 'Industry Insights Article',
        description: 'Professional article about industry trends and insights',
        contentType: 'article',
        platforms: ['linkedin'],
        targetSegments: ['professionals', 'entrepreneurs'],
        baseCost: 400,
        baseQuality: 0.8,
        requiredSkills: ['marketing', 'writing', 'industry knowledge'],
        estimatedReach: 1500,
        engagementRate: 0.03,
        leadConversionRate: 0.05,
        category: 'educational'
    },
    {
        id: 'linkedin-company-update',
        label: 'Company Milestone Post',
        description: 'Share company achievements and milestones',
        contentType: 'post',
        platforms: ['linkedin', 'facebook'],
        targetSegments: ['professionals', 'entrepreneurs'],
        baseCost: 150,
        baseQuality: 0.6,
        requiredSkills: ['marketing', 'content creation'],
        estimatedReach: 800,
        engagementRate: 0.04,
        leadConversionRate: 0.02,
        category: 'behind-the-scenes'
    },

    // Facebook Content
    {
        id: 'facebook-community-post',
        label: 'Community Engagement Post',
        description: 'Interactive post to engage with community and gather feedback',
        contentType: 'post',
        platforms: ['facebook'],
        targetSegments: ['young-professionals', 'students'],
        baseCost: 100,
        baseQuality: 0.5,
        requiredSkills: ['marketing', 'community management'],
        estimatedReach: 600,
        engagementRate: 0.07,
        leadConversionRate: 0.015,
        category: 'entertainment'
    },
    {
        id: 'facebook-live-qa',
        label: 'Live Q&A Session',
        description: 'Live video session answering customer questions',
        contentType: 'video',
        platforms: ['facebook', 'instagram'],
        targetSegments: ['young-professionals', 'entrepreneurs'],
        baseCost: 250,
        baseQuality: 0.7,
        requiredSkills: ['marketing', 'presentation', 'customer service'],
        estimatedReach: 1200,
        engagementRate: 0.15,
        leadConversionRate: 0.03,
        category: 'educational'
    },

    // TikTok Content
    {
        id: 'tiktok-trend-video',
        label: 'Trending Challenge Video',
        description: 'Participate in trending challenges with product integration',
        contentType: 'video',
        platforms: ['tiktok'],
        targetSegments: ['students', 'young-professionals'],
        baseCost: 200,
        baseQuality: 0.6,
        requiredSkills: ['marketing', 'video editing', 'trend awareness'],
        estimatedReach: 3000,
        engagementRate: 0.20,
        leadConversionRate: 0.02,
        category: 'entertainment'
    },
    {
        id: 'tiktok-quick-tip',
        label: 'Quick Productivity Tip',
        description: 'Short video with productivity tips using your product',
        contentType: 'video',
        platforms: ['tiktok', 'instagram'],
        targetSegments: ['students', 'young-professionals'],
        baseCost: 150,
        baseQuality: 0.65,
        requiredSkills: ['marketing', 'video editing'],
        estimatedReach: 2500,
        engagementRate: 0.18,
        leadConversionRate: 0.025,
        category: 'educational'
    }
];

// Helper functions
export function getContentByPlatform(platform: string): ContentTemplate[] {
    return contentTemplates.filter(content => content.platforms.includes(platform as any));
}

export function getContentByCategory(category: ContentTemplate['category']): ContentTemplate[] {
    return contentTemplates.filter(content => content.category === category);
}

export function getContentById(id: string): ContentTemplate | undefined {
    return contentTemplates.find(content => content.id === id);
}

export function getAvailableContentForPersonnel(personnelSkills: string[]): ContentTemplate[] {
    return contentTemplates.filter(content => {
        return content.requiredSkills.every(skill => personnelSkills.includes(skill));
    });
}

export function calculateContentQuality(template: ContentTemplate, personnelSkills: string[], personnelEfficiency: number): number {
    // Base quality from template
    let quality = template.baseQuality;
    
    // Bonus for having all required skills
    const hasAllSkills = template.requiredSkills.every(skill => personnelSkills.includes(skill));
    if (hasAllSkills) {
        quality += 0.1;
    }
    
    // Bonus based on personnel efficiency
    quality += (personnelEfficiency - 0.5) * 0.2;
    
    // Bonus for having extra relevant skills
    const bonusSkills = ['graphic design', 'video editing', 'writing', 'presentation', 'trend awareness'];
    const extraSkills = personnelSkills.filter(skill => bonusSkills.includes(skill) && !template.requiredSkills.includes(skill));
    quality += extraSkills.length * 0.05;
    
    // Cap at 1.0
    return Math.min(quality, 1.0);
}

export function estimateContentPerformance(template: ContentTemplate, quality: number, brandAwareness: number): {
    estimatedViews: number;
    estimatedLeads: number;
    estimatedCost: number;
} {
    // Quality and brand awareness affect performance
    const qualityMultiplier = 0.5 + (quality * 0.5);
    const awarenessMultiplier = 0.3 + (brandAwareness * 0.7);
    
    const estimatedViews = Math.floor(template.estimatedReach * qualityMultiplier * awarenessMultiplier);
    const estimatedLeads = Math.floor(estimatedViews * template.leadConversionRate * quality);
    const estimatedCost = template.baseCost;
    
    return {
        estimatedViews,
        estimatedLeads,
        estimatedCost
    };
}
