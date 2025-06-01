import type { Stylesheet, LayoutOptions } from 'cytoscape';

export const cytoscapeStylesheet: Stylesheet[] = [
    // Base node styles
    {
        selector: 'node',
        style: {
            'background-color': '#6B7280', // gray-500
            'label': 'data(label)',
            'width': '60px',
            'height': '60px',
            'text-valign': 'bottom',
            'text-halign': 'center',
            'font-size': '10px',
            'color': '#FFFFFF',
            'text-outline-width': 2,
            'text-outline-color': '#1F2937', // gray-800
            'border-width': 2,
            'border-color': '#374151', // gray-700
            'text-wrap': 'wrap',
            'text-max-width': '80px'
        }
    },
    
    // Personnel nodes (blue)
    {
        selector: 'node[type="Personnel"]',
        style: { 
            'background-color': '#3B82F6', // blue-500
            'shape': 'ellipse',
            'border-color': '#1D4ED8' // blue-700
        }
    },
    
    // Product nodes (green)
    {
        selector: 'node[type="Product"]',
        style: { 
            'background-color': '#10B981', // emerald-500
            'shape': 'round-rectangle',
            'border-color': '#047857' // emerald-700
        }
    },
    
    // Task nodes (amber)
    {
        selector: 'node[type="Task"]',
        style: { 
            'background-color': '#F59E0B', // amber-500
            'shape': 'diamond',
            'border-color': '#D97706' // amber-600
        }
    },
    
    // Resource nodes (purple)
    {
        selector: 'node[type="Resource"]',
        style: { 
            'background-color': '#8B5CF6', // violet-500
            'shape': 'rectangle',
            'border-color': '#7C3AED' // violet-600
        }
    },
    
    // Market nodes (pink)
    {
        selector: 'node[type="Market"]',
        style: { 
            'background-color': '#EC4899', // pink-500
            'shape': 'hexagon',
            'border-color': '#DB2777' // pink-600
        }
    },
    
    // Idea nodes (cyan)
    {
        selector: 'node[type="Idea"]',
        style: { 
            'background-color': '#06B6D4', // cyan-500
            'shape': 'star',
            'border-color': '#0891B2' // cyan-600
        }
    },
    
    // Selected node
    {
        selector: 'node:selected',
        style: { 
            'border-width': 4, 
            'border-color': '#FACC15', // yellow-400
            'box-shadow': '0 0 20px #FACC15'
        }
    },
    
    // Hovered node
    {
        selector: 'node:active',
        style: { 
            'overlay-opacity': 0.2,
            'overlay-color': '#FFFFFF'
        }
    },
    
    // Base edge styles
    {
        selector: 'edge',
        style: {
            'width': 2,
            'line-color': '#9CA3AF', // gray-400
            'target-arrow-color': '#9CA3AF',
            'target-arrow-shape': 'triangle',
            'curve-style': 'bezier',
            'label': 'data(label)',
            'font-size': '8px',
            'color': '#FFFFFF',
            'text-rotation': 'autorotate',
            'text-margin-y': -10,
            'text-outline-width': 1,
            'text-outline-color': '#1F2937'
        }
    },
    
    // Assignment edges (dashed violet)
    {
        selector: 'edge[type="assignment"]',
        style: { 
            'line-style': 'dashed', 
            'line-color': '#A78BFA', // violet-400
            'target-arrow-color': '#A78BFA'
        }
    },
    
    // Dependency edges (solid blue)
    {
        selector: 'edge[type="dependency"]',
        style: { 
            'line-color': '#60A5FA', // blue-400
            'target-arrow-color': '#60A5FA'
        }
    },
    
    // Creation flow edges (solid green)
    {
        selector: 'edge[type="creation_flow"]',
        style: { 
            'line-color': '#34D399', // emerald-400
            'target-arrow-color': '#34D399',
            'line-style': 'solid'
        }
    },
    
    // Market connection edges (dotted pink)
    {
        selector: 'edge[type="market_connection"]',
        style: { 
            'line-style': 'dotted',
            'line-color': '#F472B6', // pink-400
            'target-arrow-color': '#F472B6'
        }
    },
    
    // Selected edge
    {
        selector: 'edge:selected',
        style: { 
            'width': 4,
            'line-color': '#FACC15', // yellow-400
            'target-arrow-color': '#FACC15'
        }
    }
];

export function getCytoscapeLayout(name: string = 'cose'): LayoutOptions {
    const layouts: Record<string, LayoutOptions> = {
        cose: {
            name: 'cose',
            padding: 30,
            animate: true,
            animationDuration: 500,
            fit: true,
            idealEdgeLength: 100,
            nodeRepulsion: 20000,
            nodeOverlap: 10,
            gravity: 0.1,
            numIter: 1000,
            initialTemp: 200,
            coolingFactor: 0.95,
            minTemp: 1.0
        },
        
        grid: {
            name: 'grid',
            padding: 30,
            animate: true,
            animationDuration: 500,
            fit: true,
            rows: undefined,
            cols: undefined
        },
        
        circle: {
            name: 'circle',
            padding: 30,
            animate: true,
            animationDuration: 500,
            fit: true,
            radius: undefined,
            startAngle: 3 / 2 * Math.PI,
            sweep: undefined,
            clockwise: true
        },
        
        concentric: {
            name: 'concentric',
            padding: 30,
            animate: true,
            animationDuration: 500,
            fit: true,
            minNodeSpacing: 10,
            concentric: (node: any) => node.degree(),
            levelWidth: () => 1
        },
        
        breadthfirst: {
            name: 'breadthfirst',
            padding: 30,
            animate: true,
            animationDuration: 500,
            fit: true,
            directed: false,
            spacingFactor: 1.75,
            maximal: false
        }
    };
    
    return layouts[name] || layouts.cose;
}

// Helper function to convert game nodes to Cytoscape elements
export function gameNodesToCytoscapeElements(nodes: any[], edges: any[]) {
    const cytoscapeNodes = nodes.map(node => ({
        group: 'nodes' as const,
        data: {
            id: node.id,
            label: node.label,
            type: node.type,
            ...node
        },
        position: node.position || { x: Math.random() * 400, y: Math.random() * 400 }
    }));
    
    const cytoscapeEdges = edges.map(edge => ({
        group: 'edges' as const,
        data: {
            id: edge.id,
            source: edge.source,
            target: edge.target,
            label: edge.label,
            type: edge.type,
            ...edge
        }
    }));
    
    return [...cytoscapeNodes, ...cytoscapeEdges];
}

// Helper function to get node color by type
export function getNodeColorByType(nodeType: string): string {
    const colors: Record<string, string> = {
        'Personnel': '#3B82F6', // blue-500
        'Product': '#10B981',   // emerald-500
        'Task': '#F59E0B',      // amber-500
        'Resource': '#8B5CF6',  // violet-500
        'Market': '#EC4899',    // pink-500
        'Idea': '#06B6D4'       // cyan-500
    };
    
    return colors[nodeType] || '#6B7280'; // gray-500 as default
}

// Helper function to get node shape by type
export function getNodeShapeByType(nodeType: string): string {
    const shapes: Record<string, string> = {
        'Personnel': 'ellipse',
        'Product': 'round-rectangle',
        'Task': 'diamond',
        'Resource': 'rectangle',
        'Market': 'hexagon',
        'Idea': 'star'
    };
    
    return shapes[nodeType] || 'ellipse';
}
