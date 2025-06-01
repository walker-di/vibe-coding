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
            'border-color': '#1D4ED8', // blue-700
            'text-wrap': 'wrap',
            'text-max-width': '80px',
            'font-size': '10px',
            'text-outline-width': 2,
            'text-outline-color': '#1F2937'
        }
    },

    // Personnel nodes when enrolled in courses (smaller, positioned inside parent)
    {
        selector: 'node[type="Personnel"][parent]',
        style: {
            'width': '40px',
            'height': '40px',
            'font-size': '8px',
            'text-max-width': '35px'
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

    // Course nodes (green, compound parent nodes)
    {
        selector: 'node[type="Course"]',
        style: {
            'background-color': '#22C55E', // green-500
            'background-opacity': 0.8,
            'shape': 'round-rectangle',
            'border-color': '#16A34A', // green-600
            'width': '160px',
            'height': '120px',
            'text-wrap': 'wrap',
            'text-max-width': '140px',
            'font-size': '10px',
            'text-valign': 'top',
            'text-halign': 'center',
            'text-margin-y': '-15px',
            'compound-sizing-wrt-labels': 'include',
            'min-width': '160px',
            'min-height': '120px',
            'padding': '20px'
        }
    },

    // Active course nodes (brighter green)
    {
        selector: 'node[type="Course"][isActive="true"]',
        style: {
            'background-color': '#16A34A', // green-600
            'border-color': '#15803D', // green-700
            'border-width': 3
        }
    },

    // Completed course nodes (gray)
    {
        selector: 'node[type="Course"][isCompleted="true"]',
        style: {
            'background-color': '#6B7280', // gray-500
            'border-color': '#4B5563', // gray-600
            'opacity': 0.7
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
    },

    // Compound drag and drop styles
    {
        selector: '.cdnd-grabbed-node',
        style: {
            'opacity': 0.7,
            'border-width': 3,
            'border-color': '#FACC15' // yellow-400
        }
    },

    {
        selector: '.cdnd-drop-target',
        style: {
            'border-width': 4,
            'border-color': '#10B981', // emerald-500
            'background-color': '#34D399' // emerald-400
        }
    },

    {
        selector: '.cdnd-drop-sibling',
        style: {
            'border-width': 3,
            'border-color': '#F59E0B' // amber-500
        }
    }
];

export function getCytoscapeLayout(name: string = 'cose', options: { fit?: boolean } = {}): LayoutOptions {
    const { fit = false } = options; // Default to false to prevent auto-fit

    const layouts: Record<string, LayoutOptions> = {
        cose: {
            name: 'cose',
            padding: 30,
            animate: true,
            animationDuration: 500,
            fit: fit,
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
            fit: fit,
            rows: undefined,
            cols: undefined
        },

        circle: {
            name: 'circle',
            padding: 30,
            animate: true,
            animationDuration: 500,
            fit: fit,
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
            fit: fit,
            minNodeSpacing: 10,
            concentric: (node: any) => node.degree(),
            levelWidth: () => 1
        },

        breadthfirst: {
            name: 'breadthfirst',
            padding: 30,
            animate: true,
            animationDuration: 500,
            fit: fit,
            directed: false,
            spacingFactor: 1.75,
            maximal: false
        }
    };

    return layouts[name] || layouts.cose;
}

// Helper function to convert game nodes to Cytoscape elements
export function gameNodesToCytoscapeElements(nodes: any[], edges: any[]) {
    const cytoscapeNodes = nodes.map(node => {
        const nodeData: any = {
            id: node.id,
            label: node.label || node.id, // Fallback to ID if no label
            type: node.type,
            ...node
        };

        // Add action points to Personnel node labels
        if (node.type === 'Personnel' && node.actionPoints !== undefined && node.maxActionPoints !== undefined) {
            nodeData.label = `${node.label}\n⚡ ${node.actionPoints}/${node.maxActionPoints}`;
        }

        // Handle parent-child relationships for compound nodes
        if (node.type === 'Personnel') {
            // Check for course enrollment first
            const parentCourseId = node.enrolledInCourse || (node.courseProgress ? node.courseProgress.courseId : null);
            // Check for task assignment second
            const parentTaskId = node.assignedToTask || node.assignedToTaskId;

            if (parentCourseId) {
                nodeData.parent = parentCourseId;
                console.log('CYTOSCAPE: Setting parent for', node.id, 'to course', parentCourseId);
            } else if (parentTaskId) {
                nodeData.parent = parentTaskId;
                console.log('CYTOSCAPE: Setting parent for', node.id, 'to task', parentTaskId);
            } else {
                console.log('CYTOSCAPE: No parent for personnel', node.id, '- enrolledInCourse:', node.enrolledInCourse, 'assignedToTask:', node.assignedToTask);
            }
        }

        return {
            group: 'nodes' as const,
            data: nodeData,
            position: node.position || { x: Math.random() * 400, y: Math.random() * 400 }
        };
    });
    
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
    
    // Sort nodes so that parent nodes come before child nodes
    const sortedNodes = cytoscapeNodes.sort((a, b) => {
        // Parent nodes (no parent property) should come first
        const aHasParent = a.data.parent !== undefined;
        const bHasParent = b.data.parent !== undefined;

        if (!aHasParent && bHasParent) return -1; // a is parent, b is child
        if (aHasParent && !bHasParent) return 1;  // a is child, b is parent
        return 0; // both are same type
    });

    return [...sortedNodes, ...cytoscapeEdges];
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
