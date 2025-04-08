<script lang="ts">
	import { cn } from '$lib/utils'; // Assuming shadcn-svelte utils
	import type { ComponentType } from 'svelte'; // Import ComponentType

	type Option = {
		value: string | number;
		label: string;
		icon?: ComponentType | string; // Use ComponentType for Svelte components
		previewUrl?: string;
		description?: string;
	};

	let {
		options,
		selectedValue,
		label = '',
		id = '',
		disabled = false,
		error = false,
		gridCols = 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4', // Default grid layout
		cardClass = '', // Allow custom styling per card
		selectedClass = 'ring-2 ring-primary ring-offset-2', // Style for selected card
		onSelect // Callback function
	}: {
		options: Option[];
		selectedValue: string | number | undefined | null;
		label?: string;
		id?: string;
		disabled?: boolean;
		error?: boolean;
		gridCols?: string;
		cardClass?: string;
		selectedClass?: string;
		onSelect: (value: string | number) => void;
	} = $props();

	const uniqueId = id || `card-selector-${Math.random().toString(36).substring(2, 9)}`;

	function handleSelect(value: string | number) {
		if (!disabled) {
			onSelect(value);
		}
	}
</script>

{#if label}
	<label id={`${uniqueId}-label`} class={`mb-2 block text-sm font-medium ${error ? 'text-destructive' : 'text-foreground'}`}>{label}</label>
{/if}
<div class={`grid gap-4 ${gridCols}`} role="radiogroup" aria-labelledby={label ? `${uniqueId}-label` : undefined}>
	{#each options as option (option.value)}
		{@const isSelected = selectedValue === option.value}
		<button
			role="radio"
			aria-checked={isSelected}
			type="button"
			onclick={() => handleSelect(option.value)}
			disabled={disabled}
			class={cn(
				'flex cursor-pointer flex-col items-center justify-center rounded-lg border bg-card p-4 text-card-foreground shadow-sm transition-all hover:bg-accent hover:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
				isSelected && selectedClass,
				disabled && 'cursor-not-allowed opacity-50',
				error && !isSelected && 'border-destructive', // Add error border if not selected
				cardClass
			)}
			aria-pressed={isSelected}
		>
			{#if option.previewUrl}
					<img src={option.previewUrl} alt="" class="mb-2 h-20 w-full rounded object-cover" /> <!-- Alt handled by button text -->
			{:else if option.icon}
				{#if typeof option.icon === 'string'}
					<!-- Assuming icon is a path -->
					<img src={option.icon} alt="" class="mb-2 h-8 w-8" /> <!-- Alt handled by button text -->
				{:else}
					<!-- Render Lucide component directly -->
					{@const IconComponent = option.icon}
					<IconComponent class="mb-2 h-8 w-8" />
				{/if}
			{/if}
			<span class="text-center text-sm font-medium" id={`${uniqueId}-option-${option.value}-label`}>{option.label}</span>
			{#if option.description}
				<span class="mt-1 text-center text-xs text-muted-foreground">{option.description}</span>
			{/if}
		</button>
	{/each}
</div>
