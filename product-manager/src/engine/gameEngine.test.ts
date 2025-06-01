import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from './gameEngine';
import type { TaskData, PersonnelData, PitchData } from '../types';

describe('GameEngine - Create Investor Pitch Task Completion', () => {
    let gameEngine: GameEngine;

    beforeEach(() => {
        gameEngine = new GameEngine();
        // GameEngine constructor already calls initializeGameState()
    });

    it('should complete Create Investor Pitch task and create Investor Pitch node', () => {
        // Create a personnel with pitching skill
        const personnelResult = gameEngine.performAction({
            type: 'HIRE_PERSONNEL',
            payload: {
                templateId: 'founder',
                position: { x: 100, y: 100 }
            }
        });
        
        expect(personnelResult.success).toBe(true);
        const personnel = personnelResult.data as PersonnelData;
        
        // Ensure personnel has pitching skill
        personnel.skills.push('pitching');
        personnel.efficiency = 0.8;

        // Create a pitch task
        const taskResult = gameEngine.performAction({
            type: 'CREATE_PITCH',
            payload: {
                personnelId: personnel.id,
                position: { x: 200, y: 200 }
            }
        });

        expect(taskResult.success).toBe(true);
        const task = taskResult.data as TaskData;
        expect(task.label).toBe('Create Investor Pitch');
        expect(task.requiredSkills).toContain('pitching');

        // Assign personnel to the task
        const assignResult = gameEngine.performAction({
            type: 'ASSIGN_PERSONNEL_TO_TASK',
            payload: {
                personnelId: personnel.id,
                taskId: task.id
            }
        });

        expect(assignResult.success).toBe(true);

        // Verify personnel is assigned
        const updatedTask = gameEngine.getState().nodes.find(n => n.id === task.id) as TaskData;
        expect(updatedTask.assignedPersonnelIds).toContain(personnel.id);

        // Manually set task progress to 100% to trigger completion
        updatedTask.progress = 1.0;

        // Get initial node count
        const initialNodeCount = gameEngine.getState().nodes.length;
        const initialTaskExists = gameEngine.getState().nodes.some(n => n.id === task.id);
        expect(initialTaskExists).toBe(true);

        // Trigger task completion by calling the private method through real-time processing
        // We'll simulate this by directly calling the completion logic
        (gameEngine as any).completeTask(updatedTask);

        // Verify the task was removed
        const taskStillExists = gameEngine.getState().nodes.some(n => n.id === task.id);
        expect(taskStillExists).toBe(false);

        // Verify a new Investor Pitch node was created
        const pitchNode = gameEngine.getState().nodes.find(n =>
            n.type === 'Pitch' && n.label === 'Investor Pitch'
        ) as PitchData;

        expect(pitchNode).toBeDefined();
        expect(pitchNode.type).toBe('Pitch');
        expect(pitchNode.label).toBe('Investor Pitch');
        expect(pitchNode.createdBy).toBe(personnel.id);
        expect(pitchNode.isCompleted).toBe(false); // Should be a normal item, not completed
        expect(pitchNode.quality).toBeGreaterThan(0);

        // Verify personnel was unassigned and moved outside
        const updatedPersonnel = gameEngine.getState().nodes.find(n => n.id === personnel.id) as PersonnelData;
        expect(updatedPersonnel.assignedToTaskId).toBeUndefined();
        expect((updatedPersonnel as any).assignedToTask).toBeUndefined();

        // Verify personnel position was updated (should be outside the original task position)
        expect(updatedPersonnel.position.x).toBeGreaterThan(200); // Original task was at x: 200
        expect(updatedPersonnel.position.y).toBeGreaterThan(200); // Original task was at y: 200

        // Verify the pitch node is positioned at the task's original location
        expect(pitchNode.position.x).toBe(200);
        expect(pitchNode.position.y).toBe(200);
    });

    it('should handle multiple personnel assigned to Create Investor Pitch task', () => {
        // Create two personnel with pitching skills
        const personnel1Result = gameEngine.performAction({
            type: 'HIRE_PERSONNEL',
            payload: {
                templateId: 'founder',
                position: { x: 100, y: 100 }
            }
        });
        
        const personnel2Result = gameEngine.performAction({
            type: 'HIRE_PERSONNEL',
            payload: {
                templateId: 'founder',
                position: { x: 150, y: 150 }
            }
        });

        const personnel1 = personnel1Result.data as PersonnelData;
        const personnel2 = personnel2Result.data as PersonnelData;
        
        // Ensure both have pitching skill
        personnel1.skills.push('pitching');
        personnel2.skills.push('pitching');
        personnel1.efficiency = 0.8;
        personnel2.efficiency = 0.7;

        // Create a pitch task
        const taskResult = gameEngine.performAction({
            type: 'CREATE_PITCH',
            payload: {
                personnelId: personnel1.id,
                position: { x: 300, y: 300 }
            }
        });

        const task = taskResult.data as TaskData;

        // Assign both personnel to the task
        gameEngine.performAction({
            type: 'ASSIGN_PERSONNEL_TO_TASK',
            payload: { personnelId: personnel1.id, taskId: task.id }
        });
        
        gameEngine.performAction({
            type: 'ASSIGN_PERSONNEL_TO_TASK',
            payload: { personnelId: personnel2.id, taskId: task.id }
        });

        // Verify both are assigned
        const updatedTask = gameEngine.getState().nodes.find(n => n.id === task.id) as TaskData;
        expect(updatedTask.assignedPersonnelIds).toContain(personnel1.id);
        expect(updatedTask.assignedPersonnelIds).toContain(personnel2.id);

        // Complete the task
        updatedTask.progress = 1.0;
        (gameEngine as any).completeTask(updatedTask);

        // Verify task was removed
        const taskStillExists = gameEngine.getState().nodes.some(n => n.id === task.id);
        expect(taskStillExists).toBe(false);

        // Verify pitch was created
        const pitchNode = gameEngine.getState().nodes.find(n =>
            n.type === 'Pitch' && n.label === 'Investor Pitch'
        ) as PitchData;
        expect(pitchNode).toBeDefined();

        // Verify both personnel were unassigned and moved
        const updatedPersonnel1 = gameEngine.getState().nodes.find(n => n.id === personnel1.id) as PersonnelData;
        const updatedPersonnel2 = gameEngine.getState().nodes.find(n => n.id === personnel2.id) as PersonnelData;
        
        expect(updatedPersonnel1.assignedToTaskId).toBeUndefined();
        expect(updatedPersonnel2.assignedToTaskId).toBeUndefined();
        expect((updatedPersonnel1 as any).assignedToTask).toBeUndefined();
        expect((updatedPersonnel2 as any).assignedToTask).toBeUndefined();

        // Both should be positioned outside the original task area
        expect(updatedPersonnel1.position.x).toBeGreaterThan(300);
        expect(updatedPersonnel1.position.y).toBeGreaterThan(300);
        expect(updatedPersonnel2.position.x).toBeGreaterThan(300);
        expect(updatedPersonnel2.position.y).toBeGreaterThan(300);
    });

    it('should allow presenting pitch to angel founder via drag and drop', () => {
        // Create a personnel with pitching skill
        const personnelResult = gameEngine.performAction({
            type: 'HIRE_PERSONNEL',
            payload: {
                templateId: 'founder',
                position: { x: 100, y: 100 }
            }
        });

        const personnel = personnelResult.data as PersonnelData;
        personnel.skills.push('pitching');
        personnel.efficiency = 0.9; // High efficiency for good quality pitch

        // Create and complete a pitch task to get a pitch node
        const taskResult = gameEngine.performAction({
            type: 'CREATE_PITCH',
            payload: {
                personnelId: personnel.id,
                position: { x: 200, y: 200 }
            }
        });

        const task = taskResult.data as TaskData;

        // Assign personnel and complete the task
        gameEngine.performAction({
            type: 'ASSIGN_PERSONNEL_TO_TASK',
            payload: { personnelId: personnel.id, taskId: task.id }
        });

        const updatedTask = gameEngine.getState().nodes.find(n => n.id === task.id) as TaskData;
        updatedTask.progress = 1.0;
        (gameEngine as any).completeTask(updatedTask);

        // Get the created pitch
        const pitchNode = gameEngine.getState().nodes.find(n =>
            n.type === 'Pitch' && n.label === 'Investor Pitch'
        ) as PitchData;
        expect(pitchNode).toBeDefined();

        // Create an Angel Founder
        const angelFounderResult = gameEngine.performAction({
            type: 'ADD_NODE',
            payload: {
                id: 'angel-founder-test',
                label: 'Test Angel Investor',
                type: 'AngelFounder',
                description: 'A test angel investor',
                fundingAmount: 100000,
                requirements: ['pitch'],
                isAvailable: true,
                fundingProvided: false,
                expertise: ['business development'],
                networkValue: 0.8,
                position: { x: 400, y: 400 }
            }
        });

        expect(angelFounderResult.success).toBe(true);

        // Present the pitch to the angel founder (simulating drag and drop)
        const presentResult = gameEngine.performAction({
            type: 'PRESENT_PITCH',
            payload: { pitchId: pitchNode.id, angelFounderId: 'angel-founder-test' }
        });

        expect(presentResult.success).toBe(true);

        // Verify the pitch was presented
        const updatedPitch = gameEngine.getState().nodes.find(n => n.id === pitchNode.id) as PitchData;
        expect(updatedPitch.presentedTo).toContain('angel-founder-test');

        // Check if the angel founder was convinced (depends on pitch quality)
        const angelFounder = gameEngine.getState().nodes.find(n => n.id === 'angel-founder-test') as any;
        if (pitchNode.quality > 0.7) {
            expect(angelFounder.pitchId).toBe(pitchNode.id);
            expect(angelFounder.isAvailable).toBe(false);
            expect(presentResult.data.pitchAccepted).toBe(true);
        } else {
            expect(presentResult.data.pitchAccepted).toBe(false);
        }
    });
});
