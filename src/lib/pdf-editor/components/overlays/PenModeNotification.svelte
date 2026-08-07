```svelte
<script lang="ts">
	import { fly } from 'svelte/transition';
	import { LucidePen, LucideX } from 'lucide-svelte';

	interface Props {
		isPenMode: boolean;
		onClose: () => void;
	}

	let { isPenMode, onClose }: Props = $props();
</script>

{#if isPenMode}
	<div
		transition:fly={{ x: -10, y: 0, duration: 200 }}
		class="fixed top-20 left-4 z-[60] max-[640px]:top-32 max-[640px]:left-5"
		style="touch-action: manipulation; -webkit-user-select: none; user-select: none; pointer-events: none;"
	>
		<div
			class="flex items-center gap-2 rounded-lg border border-amber-200 bg-linear-to-r from-amber-50 to-yellow-50 px-3 py-2 shadow-lg max-[640px]:rounded-full max-[640px]:px-2 max-[640px]:py-1.5"
			style="pointer-events: auto;"
		>
			<div
				class="flex h-6 w-6 items-center justify-center rounded-full bg-amber-100 text-amber-600 max-[640px]:h-7 max-[640px]:w-7"
			>
				<LucidePen size={14} />
			</div>

			<div class="flex flex-col max-[640px]:hidden">
				<span class="text-xs font-medium text-amber-800">Pen Mode</span>
				<span class="text-xs text-amber-600">Touch drawing enabled</span>
			</div>

			<span class="hidden text-xs font-medium text-amber-700 max-[640px]:inline">
				Touch
			</span>

			<button
				onclick={onClose}
				class="ml-2 flex h-6 w-6 items-center justify-center rounded text-amber-600 hover:bg-amber-100 active:bg-amber-200 max-[640px]:ml-0 max-[640px]:h-7 max-[640px]:w-7 max-[640px]:rounded-full"
				title="Disable pen mode"
			>
				<LucideX size={14} />
			</button>
		</div>
	</div>
{/if}
```
