
<script lang="ts">
	import {
		LucideType,
		LucidePencilLine,
		LucideEraser,
		LucideMinus,
		LucideHighlighter,
		LucidePen,
		LucideMousePointerClick,
		LucideUndo2,
		LucideRedo2,
		LucideHand,
		LucideClipboardCheck,
		LucideEllipsis,
		LucideX
	} from '@lucide/svelte';
	import type { Component } from 'svelte';

	import { getPDFEditorContext } from '../../context/pdfEditorContext.svelte';

	interface Props {
		isAddingText: boolean;
		addingDrawing: boolean;
		isErasing: boolean;
		isAddingLine: boolean;
		isHighlighting: boolean;
		isPointerMode: boolean;
		isSelectionMode: boolean;
		isHandMode: boolean;

		allowTeacherMark?: boolean;
		enabledToolMap?: Partial<Record<string, boolean>>;

		selectedPageIndex: number;
		isPageDisabled: boolean;
		disabled?: boolean;
		isAddingDisabled: boolean;

		onAddTextField: () => void;
		onAddDrawing: () => void;
		onErasing: () => void;
		activateLineMode: () => void;
		onHighlighting: () => void;
		onPointerMode: () => void;
		onSelectionMode: () => void;
		onHandMode: () => void;
		onTeacherMark?: () => void;
		handleUndo: () => void;
		handleRedo: () => void;
	}

	interface Theme {
		border: string;
		kbd: string;
		iconColor: string;
		hoverBg: string;
	}

	interface ToolConfig {
		id: string;
		icon: Component;
		title: string;
		description: string;
		shortcut?: string;
		onclick: () => void;
		active: boolean;
		disabled: boolean;
		show?: boolean;
		toolKey?: string;
		theme: Theme;
	}

	let {
		isAddingText,
		addingDrawing,
		isErasing,
		isAddingLine,
		isHighlighting,
		isPointerMode,
		isSelectionMode,
		isHandMode,
		allowTeacherMark = false,
		enabledToolMap = {},
		selectedPageIndex,
		isPageDisabled,
		disabled = false,
		isAddingDisabled,
		onAddTextField,
		onAddDrawing,
		onErasing,
		activateLineMode,
		onHighlighting,
		onPointerMode,
		onSelectionMode,
		onHandMode,
		onTeacherMark = () => {},
		handleUndo,
		handleRedo
	}: Props = $props();

	const ctx = getPDFEditorContext();

	const themes: Record<string, Theme> = {
		blue: {
			border: 'border-blue-400',
			kbd: 'bg-blue-100 text-blue-600',
			iconColor: 'text-blue-500',
			hoverBg: 'hover:bg-blue-100'
		},
		emerald: {
			border: 'border-emerald-400',
			kbd: 'bg-emerald-100 text-emerald-600',
			iconColor: 'text-emerald-500',
			hoverBg: 'hover:bg-emerald-100'
		},
		amber: {
			border: 'border-amber-400',
			kbd: 'bg-amber-100 text-amber-600',
			iconColor: 'text-amber-500',
			hoverBg: 'hover:bg-amber-100'
		},
		red: {
			border: 'border-red-400',
			kbd: 'bg-red-100 text-red-600',
			iconColor: 'text-red-500',
			hoverBg: 'hover:bg-red-100'
		},
		yellow: {
			border: 'border-yellow-400',
			kbd: 'bg-yellow-100 text-yellow-600',
			iconColor: 'text-yellow-500',
			hoverBg: 'hover:bg-yellow-100'
		},
		purple: {
			border: 'border-purple-400',
			kbd: 'bg-purple-100 text-purple-600',
			iconColor: 'text-purple-500',
			hoverBg: 'hover:bg-purple-100'
		},
		slate: {
			border: 'border-slate-400',
			kbd: 'bg-slate-100 text-slate-600',
			iconColor: 'text-slate-600',
			hoverBg: 'hover:bg-slate-100'
		},
		orange: {
			border: 'border-orange-400',
			kbd: 'bg-orange-100 text-orange-600',
			iconColor: 'text-orange-500',
			hoverBg: 'hover:bg-orange-100'
		}
	};

	const ctxPosition = $derived(ctx.state.toolbarPosition);
	const isHorizontal = $derived(ctxPosition === 'bottom');
	const isDisabled = $derived(disabled || isPageDisabled);
	const hasExplicitToolMap = $derived(Object.keys(enabledToolMap).length > 0);

	let isOverflowExpanded = $state(false);
	let hoveredTool = $state<ToolConfig | null>(null);
	let activeBtnRect = $state<DOMRect | null>(null);

	const mobileVisibleIds = new Set([
		'undo',
		'redo',
		'selection',
		'drawing',
		'eraser'
	]);

	function isToolEnabled(key?: string) {
		return !key || !hasExplicitToolMap || enabledToolMap[key] === true;
	}

	function handleMouseEnter(event: MouseEvent, tool: ToolConfig) {
		activeBtnRect = (event.currentTarget as HTMLElement).getBoundingClientRect();
		hoveredTool = tool;
	}

	function handleMouseLeave() {
		hoveredTool = null;
		activeBtnRect = null;
	}

	const toolGroups = $derived<ToolConfig[][]>([
		[
			{
				id: 'undo',
				icon: LucideUndo2,
				title: 'Undo',
				description: 'Remove last annotation',
				shortcut: 'Ctrl+Z / ⌘Z',
				onclick: handleUndo,
				active: false,
				disabled: isDisabled,
				theme: themes.blue
			},
			{
				id: 'redo',
				icon: LucideRedo2,
				title: 'Redo',
				description: 'Restore last removed',
				shortcut: 'Ctrl+Y / ⌘Y',
				onclick: handleRedo,
				active: false,
				disabled: isDisabled,
				theme: themes.blue
			}
		],
		[
			{
				id: 'selection',
				toolKey: 'select',
				icon: LucideMousePointerClick,
				title: 'Select & Move',
				description: 'Select and move annotations',
				shortcut: 'V',
				onclick: onSelectionMode,
				active: isSelectionMode,
				disabled: selectedPageIndex < 0 || isDisabled,
				theme: themes.blue
			},
			{
				id: 'hand',
				toolKey: 'hand',
				icon: LucideHand,
				title: 'Hand Tool',
				description: 'Pan and navigate (Space holds temporarily)',
				shortcut: 'H / Space',
				onclick: onHandMode,
				active: isHandMode,
				disabled: selectedPageIndex < 0,
				theme: themes.emerald
			}
		],
		[
			{
				id: 'drawing',
				toolKey: 'pen',
				icon: LucidePencilLine,
				title: 'Draw',
				description: 'Draw freehand annotations',
				shortcut: 'D',
				onclick: onAddDrawing,
				active: addingDrawing,
				disabled: selectedPageIndex < 0 || isDisabled,
				theme: themes.amber
			},
			{
				id: 'eraser',
				toolKey: 'eraser',
				icon: LucideEraser,
				title: 'Erase',
				description: 'Remove annotations by drawing',
				shortcut: 'E',
				onclick: onErasing,
				active: isErasing,
				disabled: isDisabled,
				theme: themes.red
			}
		],
		[
			{
				id: 'highlighter',
				toolKey: 'highlighter',
				icon: LucideHighlighter,
				title: 'Highlight',
				description: 'Highlight text with transparency',
				onclick: onHighlighting,
				active: isHighlighting,
				disabled: selectedPageIndex < 0 || isDisabled,
				theme: themes.yellow
			},
			{
				id: 'text',
				toolKey: 'text',
				icon: LucideType,
				title: 'Add Text',
				description: 'Click anywhere to add text',
				shortcut: 'T',
				onclick: onAddTextField,
				active: isAddingText,
				disabled: isAddingDisabled || isDisabled,
				theme: themes.purple
			},
			{
				id: 'line',
				toolKey: 'line',
				icon: LucideMinus,
				title: 'Line',
				description: 'Draw straight lines',
				onclick: activateLineMode,
				active: isAddingLine,
				disabled: selectedPageIndex < 0 || isDisabled,
				theme: themes.slate
			},
			{
				id: 'teacherMark',
				icon: LucideClipboardCheck,
				title: 'Teacher Stamp',
				description: 'Mark this answer as checked',
				onclick: onTeacherMark,
				active: false,
				disabled: selectedPageIndex < 0 || isDisabled,
				show: allowTeacherMark,
				theme: themes.emerald
			},
			{
				id: 'pointer',
				toolKey: 'pointer',
				icon: LucidePen,
				title: 'Pointer',
				description: 'Draw temporary strokes',
				onclick: onPointerMode,
				active: isPointerMode,
				disabled: selectedPageIndex < 0 || isDisabled,
				theme: themes.orange
			}
		]
	]);

	const visibleTools = (group: ToolConfig[]) =>
		group.filter((tool) => (tool.show ?? true) && isToolEnabled(tool.toolKey));

	const tooltipStyle = $derived.by(() => {
		if (!activeBtnRect) return '';

		const offset = 12;
		const { top, left, right, width, height } = activeBtnRect;

		if (ctxPosition === 'bottom') {
			return `bottom:${window.innerHeight - top + offset}px;left:${left + width / 2}px;transform:translateX(-50%)`;
		}

		if (ctxPosition === 'left') {
			return `top:${top + height / 2}px;left:${right + offset}px;transform:translateY(-50%)`;
		}

		return `top:${top + height / 2}px;right:${window.innerWidth - left + offset}px;transform:translateY(-50%)`;
	});
</script>

{#snippet toolButton(tool: ToolConfig)}
	{@const Icon = tool.icon}

	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="relative flex items-center justify-center"
		onmouseenter={(event) => handleMouseEnter(event, tool)}
		onmouseleave={handleMouseLeave}
	>
		<button
			onclick={tool.onclick}
			disabled={tool.disabled}
			aria-label={tool.title}
			aria-pressed={tool.active}
			class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-all active:scale-95 disabled:cursor-not-allowed disabled:opacity-40 {tool.active
				? tool.theme.kbd
				: tool.theme.hoverBg}"
		>
			<Icon size={18} class={tool.theme.iconColor} />
		</button>
	</div>
{/snippet}

<div
	class="pdf-editor-touch-controls fixed z-70 transform transition-all duration-300 {ctxPosition === 'bottom'
		? 'bottom-6 left-1/2 max-w-[calc(100vw-1rem)] -translate-x-1/2'
		: ctxPosition === 'left'
			? 'top-1/2 left-4 max-h-[calc(100dvh-12rem)] -translate-y-1/2'
			: 'top-1/2 right-4 max-h-[calc(100dvh-12rem)] -translate-y-1/2'}"
>
	<div
		class="scrollbar-thin flex gap-1 rounded-xl border border-gray-200 bg-white px-2 py-2 shadow-2xl transition-all duration-300 {isHorizontal
			? 'max-w-[calc(100vw-1rem)] items-center'
			: 'max-h-[calc(100dvh-12rem)] flex-col items-center'}"
	>
		<!-- Desktop toolbar -->
		<div class="hidden gap-1 md:flex {isHorizontal ? 'items-center' : 'flex-col items-center'}">
			{#each toolGroups as group, index}
				{#if index > 0}
					<div class="bg-gray-300 self-center {isHorizontal ? 'mx-1 h-6 w-px' : 'my-1 h-px w-6'}"></div>
				{/if}

				{#each visibleTools(group) as tool}
					{@render toolButton(tool)}
				{/each}
			{/each}
		</div>

		<!-- Mobile toolbar -->
		<div class="flex items-center gap-1 md:hidden">
			{#each toolGroups.slice(0, 3) as group, index}
				{#if index > 0}
					<div class="bg-gray-300 mx-1 h-6 w-px self-center"></div>
				{/if}

				{#each visibleTools(group).filter((tool) => mobileVisibleIds.has(tool.id)) as tool}
					{@render toolButton(tool)}
				{/each}
			{/each}

			<div class="relative flex shrink-0 flex-col items-center">
				{#if isOverflowExpanded}
					<div class="absolute bottom-full left-1/2 z-90 mb-2 flex max-h-[65dvh] -translate-x-1/2 flex-col items-center gap-1 overflow-y-auto rounded-xl border border-gray-200 bg-white p-2 shadow-2xl">
						{#each toolGroups.slice(3) as group, index}
							{#each visibleTools(group) as tool}
								{@render toolButton(tool)}
							{/each}

							{#if index < toolGroups.slice(3).length - 1}
								<div class="my-1 h-px w-6 shrink-0 bg-gray-300"></div>
							{/if}
						{/each}
					</div>
				{/if}

				<button
					onclick={() => (isOverflowExpanded = !isOverflowExpanded)}
					aria-label={isOverflowExpanded ? 'Collapse tools' : 'Expand tools'}
					aria-expanded={isOverflowExpanded}
					class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-gray-600 transition-all hover:bg-gray-100 active:scale-95"
				>
					{#if isOverflowExpanded}
						<LucideX size={18} />
					{:else}
						<LucideEllipsis size={18} />
					{/if}
				</button>
			</div>
		</div>
	</div>
</div>

<!-- Shared hover tooltip -->
{#if hoveredTool && activeBtnRect}
	{@const ToolIcon = hoveredTool.icon}

	<div
		class="pointer-events-none fixed z-80 transition-all duration-150"
		style={tooltipStyle}
	>
		<div class="max-w-xs rounded-lg border-2 {hoveredTool.theme.border} bg-white px-3 py-2 text-black shadow-lg">
			<div class="flex items-center justify-between gap-2 text-sm font-medium text-gray-800">
				<div class="flex min-w-0 items-center gap-1.5">
					<ToolIcon size={16} class="shrink-0 {hoveredTool.theme.iconColor}" />
					<span class="truncate">{hoveredTool.title}</span>
				</div>

				{#if hoveredTool.shortcut}
					<span class="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold {hoveredTool.theme.kbd}">
						{hoveredTool.shortcut}
					</span>
				{/if}
			</div>

			<p class="mt-1 text-xs leading-tight text-gray-500">
				{hoveredTool.description}
			</p>
		</div>
	</div>
{/if}