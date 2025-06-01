// Population segments for customer targeting

import type { PopulationSegment } from '../types';

export const populationSegments: PopulationSegment[] = [
    {
        id: 'young-professionals',
        name: 'Young Professionals',
        size: 50000,
        interests: ['productivity', 'career growth', 'technology', 'networking'],
        conversionRate: 0.08,
        averageValue: 150,
        platforms: ['linkedin', 'instagram', 'facebook']
    },
    {
        id: 'students',
        name: 'Students',
        size: 75000,
        interests: ['education', 'budget-friendly', 'productivity', 'social'],
        conversionRate: 0.05,
        averageValue: 50,
        platforms: ['instagram', 'tiktok', 'youtube']
    },
    {
        id: 'entrepreneurs',
        name: 'Entrepreneurs',
        size: 25000,
        interests: ['business growth', 'innovation', 'efficiency', 'leadership'],
        conversionRate: 0.12,
        averageValue: 300,
        platforms: ['linkedin', 'youtube', 'facebook']
    },
    {
        id: 'freelancers',
        name: 'Freelancers',
        size: 35000,
        interests: ['productivity', 'time management', 'client management', 'income'],
        conversionRate: 0.10,
        averageValue: 120,
        platforms: ['linkedin', 'instagram', 'youtube']
    },
    {
        id: 'small-business-owners',
        name: 'Small Business Owners',
        size: 20000,
        interests: ['business efficiency', 'cost reduction', 'team management', 'growth'],
        conversionRate: 0.15,
        averageValue: 500,
        platforms: ['linkedin', 'facebook', 'youtube']
    },
    {
        id: 'tech-enthusiasts',
        name: 'Tech Enthusiasts',
        size: 40000,
        interests: ['latest technology', 'innovation', 'gadgets', 'early adoption'],
        conversionRate: 0.07,
        averageValue: 200,
        platforms: ['youtube', 'instagram', 'tiktok']
    },
    {
        id: 'creative-professionals',
        name: 'Creative Professionals',
        size: 30000,
        interests: ['design', 'creativity', 'visual content', 'artistic tools'],
        conversionRate: 0.09,
        averageValue: 180,
        platforms: ['instagram', 'youtube', 'linkedin']
    },
    {
        id: 'remote-workers',
        name: 'Remote Workers',
        size: 45000,
        interests: ['remote collaboration', 'productivity', 'work-life balance', 'digital tools'],
        conversionRate: 0.11,
        averageValue: 160,
        platforms: ['linkedin', 'facebook', 'instagram']
    }
];

// Helper functions
export function getSegmentById(id: string): PopulationSegment | undefined {
    return populationSegments.find(segment => segment.id === id);
}

export function getSegmentsByPlatform(platform: string): PopulationSegment[] {
    return populationSegments.filter(segment => segment.platforms.includes(platform as any));
}

export function getSegmentsByInterest(interest: string): PopulationSegment[] {
    return populationSegments.filter(segment => segment.interests.includes(interest));
}

export function getTotalMarketSize(): number {
    return populationSegments.reduce((total, segment) => total + segment.size, 0);
}

export function getWeightedAverageConversionRate(): number {
    const totalSize = getTotalMarketSize();
    const weightedSum = populationSegments.reduce((sum, segment) => {
        return sum + (segment.conversionRate * segment.size);
    }, 0);
    return weightedSum / totalSize;
}

export function getWeightedAverageValue(): number {
    const totalSize = getTotalMarketSize();
    const weightedSum = populationSegments.reduce((sum, segment) => {
        return sum + (segment.averageValue * segment.size);
    }, 0);
    return weightedSum / totalSize;
}

// Content affinity matrix - how much each segment likes different content types
export const contentAffinityMatrix: Record<string, Record<string, number>> = {
    'young-professionals': {
        'educational': 0.8,
        'promotional': 0.6,
        'entertainment': 0.4,
        'behind-the-scenes': 0.5,
        'testimonial': 0.7
    },
    'students': {
        'educational': 0.9,
        'promotional': 0.4,
        'entertainment': 0.8,
        'behind-the-scenes': 0.6,
        'testimonial': 0.5
    },
    'entrepreneurs': {
        'educational': 0.9,
        'promotional': 0.7,
        'entertainment': 0.3,
        'behind-the-scenes': 0.6,
        'testimonial': 0.8
    },
    'freelancers': {
        'educational': 0.8,
        'promotional': 0.6,
        'entertainment': 0.4,
        'behind-the-scenes': 0.5,
        'testimonial': 0.7
    },
    'small-business-owners': {
        'educational': 0.8,
        'promotional': 0.7,
        'entertainment': 0.2,
        'behind-the-scenes': 0.4,
        'testimonial': 0.9
    },
    'tech-enthusiasts': {
        'educational': 0.7,
        'promotional': 0.8,
        'entertainment': 0.6,
        'behind-the-scenes': 0.7,
        'testimonial': 0.6
    },
    'creative-professionals': {
        'educational': 0.6,
        'promotional': 0.5,
        'entertainment': 0.8,
        'behind-the-scenes': 0.9,
        'testimonial': 0.6
    },
    'remote-workers': {
        'educational': 0.8,
        'promotional': 0.6,
        'entertainment': 0.5,
        'behind-the-scenes': 0.6,
        'testimonial': 0.7
    }
};

// Platform effectiveness for each segment
export const platformEffectivenessMatrix: Record<string, Record<string, number>> = {
    'young-professionals': {
        'instagram': 0.8,
        'facebook': 0.6,
        'youtube': 0.7,
        'linkedin': 0.9,
        'tiktok': 0.4
    },
    'students': {
        'instagram': 0.9,
        'facebook': 0.5,
        'youtube': 0.8,
        'linkedin': 0.3,
        'tiktok': 0.9
    },
    'entrepreneurs': {
        'instagram': 0.6,
        'facebook': 0.7,
        'youtube': 0.8,
        'linkedin': 0.9,
        'tiktok': 0.2
    },
    'freelancers': {
        'instagram': 0.7,
        'facebook': 0.6,
        'youtube': 0.8,
        'linkedin': 0.8,
        'tiktok': 0.3
    },
    'small-business-owners': {
        'instagram': 0.5,
        'facebook': 0.8,
        'youtube': 0.7,
        'linkedin': 0.9,
        'tiktok': 0.2
    },
    'tech-enthusiasts': {
        'instagram': 0.7,
        'facebook': 0.5,
        'youtube': 0.9,
        'linkedin': 0.6,
        'tiktok': 0.7
    },
    'creative-professionals': {
        'instagram': 0.9,
        'facebook': 0.6,
        'youtube': 0.8,
        'linkedin': 0.7,
        'tiktok': 0.6
    },
    'remote-workers': {
        'instagram': 0.7,
        'facebook': 0.7,
        'youtube': 0.6,
        'linkedin': 0.8,
        'tiktok': 0.3
    }
};

export function getContentAffinity(segmentId: string, contentCategory: string): number {
    return contentAffinityMatrix[segmentId]?.[contentCategory] || 0.5;
}

export function getPlatformEffectiveness(segmentId: string, platform: string): number {
    return platformEffectivenessMatrix[segmentId]?.[platform] || 0.5;
}

export function calculateSegmentReach(segmentId: string, platform: string, contentCategory: string, brandAwareness: number): number {
    const segment = getSegmentById(segmentId);
    if (!segment) return 0;
    
    const platformEff = getPlatformEffectiveness(segmentId, platform);
    const contentAff = getContentAffinity(segmentId, contentCategory);
    const awarenessBonus = 0.5 + (brandAwareness * 0.5);
    
    // Base reach is a percentage of segment size
    const baseReachRate = 0.02; // 2% of segment can potentially see content
    
    return Math.floor(segment.size * baseReachRate * platformEff * contentAff * awarenessBonus);
}
