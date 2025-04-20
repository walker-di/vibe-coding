<script>
    import 'bootstrap/dist/css/bootstrap.min.css';
    import { onMount } from 'svelte';
    
    onMount(() => {
        // Import Bootstrap JS on the client side
        import('bootstrap/dist/js/bootstrap.bundle.min.js');
    });
</script>

<slot />
