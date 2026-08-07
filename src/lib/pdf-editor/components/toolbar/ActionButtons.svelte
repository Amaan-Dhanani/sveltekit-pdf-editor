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
