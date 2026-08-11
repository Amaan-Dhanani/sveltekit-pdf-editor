<script lang="ts">
	import { Maximize, Minimize, Save, Check, LoaderCircle } from '@lucide/svelte';
	import type { SaveState } from '../../context/pdfEditorContext.svelte.ts';

	interface Props {
		saveState: SaveState;
		homework_info?: any;
		allowPrinting: boolean;
		pdfFile: File | undefined;
		saving: boolean;
		isFullscreen: boolean;
		isCompleting?: boolean;
		pages: any[];
		onSave: () => void;
		onDone: () => void | Promise<void>;
		onToggleFullscreen: () => void;
		onViewHomeworkInfo?: () => void;
		onPrint?: () => void;
	}

	let {
		saveState,
		homework_info,
		allowPrinting,
		pdfFile,
		saving,
		isFullscreen,
		isCompleting = false,
		pages,
		onSave,
		onDone,
		onToggleFullscreen,
		onViewHomeworkInfo,
		onPrint
	}: Props = $props();

	let isDoneProcessing = $derived(isCompleting || saveState.status === 'saving');
	let isDoneDisabled = $derived(isDoneProcessing || !pdfFile);
	let doneLabel = $derived(
		isCompleting ? 'Finishing...' : saveState.status === 'saving' ? 'Saving...' : 'Done'
	);
</script>

<div class="flex items-center gap-2">
	{#if homework_info}
		<button
			onclick={() => {
				onViewHomeworkInfo?.();
			}}
			class="hidden rounded-lg border border-amber-400 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-600 hover:bg-amber-100 active:bg-amber-200 sm:flex"
		>
			Homework Info
		</button>
	{/if}

	{#if allowPrinting}
		<button
			onclick={onPrint}
			class="rounded-lg bg-linear-to-r from-amber-500 to-yellow-400 px-4 py-2 text-sm font-medium text-white shadow-sm hover:from-amber-600 hover:to-yellow-500 active:from-amber-700 active:to-yellow-600 disabled:opacity-60"
			class:cursor-not-allowed={pages.length === 0 || saving || !pdfFile}
			disabled={pages.length === 0 || saving || !pdfFile}
		>
			{saving ? 'Saving...' : 'Print'}
		</button>
	{/if}

	<button
		onclick={onToggleFullscreen}
		class="group rounded-lg border-2 border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm transition-all hover:border-gray-400 hover:bg-gray-50 active:scale-95"
	>
		<span class="flex items-center gap-2">
			{#if isFullscreen}
				<Minimize size={16} class="transition-transform group-hover:scale-110" />
			{:else}
				<Maximize size={16} class="transition-transform group-hover:scale-110" />
			{/if}
		</span>
	</button>

	<button
		disabled={saveState.status === 'saving' || !pdfFile}
		class={`rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all ${
			saveState.status === 'saving' || !pdfFile
				? 'cursor-not-allowed bg-gray-200 text-gray-400'
				: 'bg-linear-to-r from-amber-400 to-orange-400 text-white hover:from-amber-500 hover:to-orange-500 active:scale-95'
		}`}
		onclick={() => {
			onSave();
		}}
	>
		<span class="flex items-center gap-2">
			<Save size={16} />
			{saveState.status === 'saving' ? 'Saving...' : 'Save'}
		</span>
	</button>

	<button
		disabled={isDoneDisabled}
		aria-busy={isDoneProcessing}
		aria-label={doneLabel}
		class={`rounded-lg px-4 py-2 text-sm font-medium shadow-sm transition-all ${
			isDoneDisabled
				? 'cursor-not-allowed bg-gray-200 text-gray-400'
				: 'bg-linear-to-r from-emerald-500 to-teal-400 text-white hover:from-emerald-600 hover:to-teal-500 active:scale-95'
		}`}
		onclick={onDone}
	>
		<span class="flex items-center gap-2">
			{#if isDoneProcessing}
				<LoaderCircle size={16} class="animate-spin" />
			{:else}
				<Check size={16} />
			{/if}
			{doneLabel}
		</span>
	</button>
</div>