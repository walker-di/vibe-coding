<script lang="ts">
    import { onMount } from 'svelte';
    import { CanvasService } from '$lib/canvas-service.svelte';
    import { Rect, Circle, Triangle } from 'fabric';

    let canvasEl: HTMLCanvasElement;
    let canvasService: CanvasService;

    onMount(() => {
        // Initialize canvas
        canvasService = new CanvasService(canvasEl);
        const canvas = canvasService.canvas;

        // Add some shapes to test snapping
        const rect = new Rect({
            left: 100,
            top: 100,
            width: 100,
            height: 100,
            fill: 'red',
            stroke: 'black',
            strokeWidth: 2,
            rx: 10,
            ry: 10
        });

        const circle = new Circle({
            left: 300,
            top: 300,
            radius: 50,
            fill: 'blue',
            stroke: 'black',
            strokeWidth: 2
        });

        const triangle = new Triangle({
            left: 500,
            top: 500,
            width: 100,
            height: 100,
            fill: 'green',
            stroke: 'black',
            strokeWidth: 2
        });

        // Add shapes to canvas
        canvas.add(rect);
        canvas.add(circle);
        canvas.add(triangle);

        const rotatedRect = new Rect({
            left: 400,
            top: 150,
            width: 80,
            height: 80,
            fill: 'purple',
            stroke: 'black',
            strokeWidth: 2,
            angle: 30 // Initial rotation
        });
        canvas.add(rotatedRect);

        // Render canvas
        canvas.renderAll();

        // Add instructions
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.innerHTML = `
                <h3>Canvas Border Snap Test</h3>
                <p>Try moving, scaling, or resizing the shapes. They should snap to the canvas borders when they get close.</p>
                <ul>
                    <li>Move: Click and drag a shape</li>
                    <li>Scale: Click a shape and drag the corner handles</li>
                    <li>Rotate: Click a shape and drag the rotation handle</li>
                </ul>
            `;
        }
    });
</script>

<div class="container">
    <div id="instructions" class="instructions"></div>
    <div class="canvas-container">
        <canvas bind:this={canvasEl}></canvas>
    </div>
</div>

<style>
    .container {
        display: flex;
        flex-direction: column;
        height: 100vh;
        padding: 20px;
    }

    .instructions {
        margin-bottom: 20px;
    }

    .canvas-container {
        flex: 1;
        border: 1px solid #ccc;
        overflow: hidden;
        position: relative;
    }

    canvas {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
    }
</style>
