import { writable, derived } from 'svelte/store';
import type { BaseNodeData, UIState, Notification } from '../types';

// UI state using Svelte stores
export const selectedNodeId = writable<string | null>(null);
export const contextMenu = writable({
    visible: false,
    x: 0,
    y: 0,
    nodeId: null as string | null
});
export const infoPanelData = writable<BaseNodeData | null>(null);
export const notifications = writable<Notification[]>([]);

// Derived states
export const hasSelection = derived(selectedNodeId, $selectedNodeId => $selectedNodeId !== null);
export const isContextMenuVisible = derived(contextMenu, $contextMenu => $contextMenu.visible);
export const hasNotifications = derived(notifications, $notifications => $notifications.length > 0);

// Selection management
export function selectNode(nodeId: string, nodeData?: BaseNodeData) {
    selectedNodeId.set(nodeId);
    infoPanelData.set(nodeData || null);
}

export function deselectNode() {
    selectedNodeId.set(null);
    infoPanelData.set(null);
}

export function toggleNodeSelection(nodeId: string, nodeData?: BaseNodeData) {
    selectedNodeId.subscribe(currentId => {
        if (currentId === nodeId) {
            deselectNode();
        } else {
            selectNode(nodeId, nodeData);
        }
    })();
}

// Context menu management
export function showContextMenu(nodeId: string, x: number, y: number) {
    contextMenu.set({
        visible: true,
        x: x,
        y: y,
        nodeId: nodeId
    });
}

export function hideContextMenu() {
    contextMenu.set({
        visible: false,
        x: 0,
        y: 0,
        nodeId: null
    });
}

// Info panel management
export function setInfoPanelData(nodeData: BaseNodeData | null) {
    infoPanelData.set(nodeData);
}

export function clearInfoPanel() {
    infoPanelData.set(null);
}

// Notification management
export function addNotification(notification: Omit<Notification, 'id' | 'timestamp'>): string {
    const id = `notification-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newNotification: Notification = {
        id,
        timestamp: Date.now(),
        ...notification
    };

    notifications.update(current => [...current, newNotification]);

    // Auto-dismiss if duration is specified
    if (notification.duration) {
        setTimeout(() => {
            removeNotification(id);
        }, notification.duration);
    }

    return id;
}

export function removeNotification(notificationId: string) {
    notifications.update(current => current.filter(n => n.id !== notificationId));
}

export function clearAllNotifications() {
    notifications.set([]);
}

// Convenience notification functions
export function showSuccessNotification(message: string, duration = 3000) {
    return addNotification({
        type: 'success',
        message,
        duration
    });
}

export function showErrorNotification(message: string, duration = 5000) {
    return addNotification({
        type: 'error',
        message,
        duration
    });
}

export function showInfoNotification(message: string, duration = 3000) {
    return addNotification({
        type: 'info',
        message,
        duration
    });
}

export function showWarningNotification(message: string, duration = 4000) {
    return addNotification({
        type: 'warning',
        message,
        duration
    });
}

// UI state getters
export function getUIState(): UIState {
    let currentSelectedNodeId: string | null;
    let currentContextMenu: any;
    let currentInfoPanelData: BaseNodeData | null;
    let currentNotifications: Notification[];

    selectedNodeId.subscribe(value => currentSelectedNodeId = value)();
    contextMenu.subscribe(value => currentContextMenu = value)();
    infoPanelData.subscribe(value => currentInfoPanelData = value)();
    notifications.subscribe(value => currentNotifications = value)();

    return {
        selectedNodeId: currentSelectedNodeId,
        contextMenu: { ...currentContextMenu },
        infoPanelData: currentInfoPanelData,
        notifications: [...currentNotifications]
    };
}
