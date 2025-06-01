// Type declarations for cytoscape-compound-drag-and-drop

declare module 'cytoscape-compound-drag-and-drop' {
    import { Core, NodeSingular } from 'cytoscape';

    interface CompoundDragAndDropOptions {
        grabbedNode?: (node: NodeSingular) => boolean;
        dropTarget?: (dropTarget: NodeSingular, grabbedNode: NodeSingular) => boolean;
        dropSibling?: (dropSibling: NodeSingular, grabbedNode: NodeSingular) => boolean;
        newParentNode?: (grabbedNode: NodeSingular, dropSibling: NodeSingular) => any;
        boundingBoxOptions?: {
            includeOverlays?: boolean;
            includeLabels?: boolean;
        };
        overThreshold?: number;
        outThreshold?: number;
    }

    interface CompoundDragAndDropInstance {
        disable(): void;
        enable(): void;
        destroy(): void;
    }

    function compoundDragAndDrop(cytoscape: any): void;

    export = compoundDragAndDrop;
}

declare module 'cytoscape' {
    interface Core {
        compoundDragAndDrop(options?: import('cytoscape-compound-drag-and-drop').CompoundDragAndDropOptions): import('cytoscape-compound-drag-and-drop').CompoundDragAndDropInstance;
    }
}
