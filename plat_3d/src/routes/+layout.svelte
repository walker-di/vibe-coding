<script lang="ts">
    import 'bootstrap/dist/css/bootstrap.min.css';
    import { onMount } from 'svelte';
    interface Props {
        children?: import('svelte').Snippet;
    }

    let { children }: Props = $props();
    
    onMount(() => {
        // Import Bootstrap JS on the client side
        import('bootstrap/dist/js/bootstrap.bundle.min.js');
    });
</script>

{@render children?.()}
