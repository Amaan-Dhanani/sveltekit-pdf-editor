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
        LucideClipboardCheck
    } from '@lucide/svelte';
    import type { Component } from 'svelte';
    import { onMount } from 'svelte';

    import ToolbarOverflow from './ToolbarOverflow.svelte';
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

    let isMobile = $state(false);
    
    // Store hovered tool details & button rect coordinates
    let hoveredTool = $state<ToolConfig | null>(null);
    let activeBtnRect = $state<DOMRect | null>(null);

    let isDisabled = $derived(disabled || isPageDisabled);
    let hasExplicitToolMap = $derived(Object.keys(enabledToolMap).length > 0);
    let toolbarPosition = $derived(ctx.state.toolbarPosition);
    let isToolButtons = $derived(toolbarPosition === 'bottom');

    function isToolEnabled(toolKey?: string) {
        if (!toolKey) return true;
        return !hasExplicitToolMap || enabledToolMap[toolKey] === true;
    }

    function handleMouseEnter(e: MouseEvent, tool: ToolConfig) {
        if (isMobile) return;
        const target = e.currentTarget as HTMLElement;
        activeBtnRect = target.getBoundingClientRect();
        hoveredTool = tool;
    }

    function handleMouseLeave() {
        hoveredTool = null;
        activeBtnRect = null;
    }

    onMount(() => {
        const checkMobile = () => {
            isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
        };
        checkMobile();
        window.addEventListener('resize', checkMobile);
        return () => window.removeEventListener('resize', checkMobile);
    });

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
        theme?: {
            border: string;
            kbd: string;
            iconColor: string;
        };
    }

    let toolGroups = $derived<ToolConfig[][]>([
        // Group 1: History
        [
            {
                id: 'undo',
                icon: LucideUndo2,
                title: 'Undo',
                description: 'Remove last annotation',
                shortcut: 'Ctrl+Z',
                onclick: handleUndo,
                active: false,
                disabled: isDisabled,
                theme: { border: 'border-blue-400', kbd: 'bg-blue-100 text-blue-600', iconColor: 'text-blue-500' }
            },
            {
                id: 'redo',
                icon: LucideRedo2,
                title: 'Redo',
                description: 'Restore last removed',
                shortcut: 'Ctrl+Y',
                onclick: handleRedo,
                active: false,
                disabled: isDisabled,
                theme: { border: 'border-blue-400', kbd: 'bg-blue-100 text-blue-600', iconColor: 'text-blue-500' }
            }
        ],
        // Group 2: Navigation & Selection
        [
            {
                id: 'selection',
                icon: LucideMousePointerClick,
                title: 'Select & Move',
                description: 'Select and move annotations',
                shortcut: 'V',
                onclick: onSelectionMode,
                active: isSelectionMode,
                disabled: selectedPageIndex < 0 || isDisabled,
                theme: { border: 'border-blue-400', kbd: 'bg-blue-100 text-blue-600', iconColor: 'text-blue-500' }
            },
            {
                id: 'hand',
                icon: LucideHand,
                title: 'Hand Tool',
                description: 'Pan and navigate (Space holds temporarily)',
                shortcut: 'H / Space',
                onclick: onHandMode,
                active: isHandMode,
                disabled: selectedPageIndex < 0,
                theme: { border: 'border-emerald-400', kbd: 'bg-emerald-100 text-emerald-600', iconColor: 'text-emerald-500' }
            }
        ],
        // Group 3: Freehand & Erase
        [
            {
                id: 'drawing',
                icon: LucidePencilLine,
                title: 'Draw',
                description: 'Draw freehand annotations',
                shortcut: 'D',
                onclick: onAddDrawing,
                active: addingDrawing,
                disabled: selectedPageIndex < 0 || isDisabled,
                theme: { border: 'border-amber-400', kbd: 'bg-amber-100 text-amber-600', iconColor: 'text-amber-500' }
            },
            {
                id: 'eraser',
                icon: LucideEraser,
                title: 'Erase',
                description: 'Remove annotations by drawing',
                shortcut: 'E',
                onclick: onErasing,
                active: isErasing,
                disabled: isDisabled,
                theme: { border: 'border-red-400', kbd: 'bg-red-100 text-red-600', iconColor: 'text-red-500' }
            }
        ],
        // Group 4: Annotations & Utilities
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
                theme: { border: 'border-yellow-400', kbd: 'bg-yellow-100 text-yellow-600', iconColor: 'text-yellow-500' }
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
                theme: { border: 'border-purple-400', kbd: 'bg-purple-100 text-purple-600', iconColor: 'text-purple-500' }
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
                theme: { border: 'border-slate-400', kbd: 'bg-slate-100 text-slate-600', iconColor: 'text-slate-600' }
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
                theme: { border: 'border-emerald-400', kbd: 'bg-emerald-100 text-emerald-600', iconColor: 'text-emerald-500' }
            },
            {
                id: 'pointer',
                icon: LucidePen,
                title: 'Pointer',
                description: 'Draw temporary strokes',
                onclick: onPointerMode,
                active: isPointerMode,
                disabled: selectedPageIndex < 0 || isDisabled,
                theme: { border: 'border-orange-400', kbd: 'bg-orange-100 text-orange-600', iconColor: 'text-orange-500' }
            }
        ]
    ]);

    let mobileVisibleIds = new Set(['undo', 'redo', 'selection', 'drawing', 'eraser']);

    // Calculate absolute position for the floating tooltip dynamically
    let tooltipStyle = $derived.by(() => {
        if (!activeBtnRect) return '';
        
        const offset = 12; // Gap between button and tooltip

        if (toolbarPosition === 'bottom') {
            return `bottom: ${window.innerHeight - activeBtnRect.top + offset}px; left: ${activeBtnRect.left + activeBtnRect.width / 2}px; transform: translateX(-50%);`;
        } else if (toolbarPosition === 'left') {
            return `top: ${activeBtnRect.top + activeBtnRect.height / 2}px; left: ${activeBtnRect.right + offset}px; transform: translateY(-50%);`;
        } else {
            // right position
            return `top: ${activeBtnRect.top + activeBtnRect.height / 2}px; right: ${window.innerWidth - activeBtnRect.left + offset}px; transform: translateY(-50%);`;
        }
    });
</script>

{#snippet toolButton(tool: ToolConfig)}
    {@const Icon = tool.icon}
    {@const theme = tool.theme ?? { border: 'border-blue-400', kbd: 'bg-blue-100 text-blue-600', iconColor: 'text-blue-500' }}

    <div 
        role="tooltip"
        class="relative flex items-center justify-center"
        onmouseenter={(e) => handleMouseEnter(e, tool)}
        onmouseleave={handleMouseLeave}
    >
        <button
            onclick={tool.onclick}
            disabled={tool.disabled}
            class="flex h-9 w-9 items-center justify-center rounded-lg transition-all hover:bg-gray-100 active:scale-95 disabled:cursor-not-allowed disabled:opacity-40"
            class:bg-blue-100={tool.active}
            class:text-blue-600={tool.active}
            class:text-gray-700={!tool.active}
        >
            <Icon size={18} class={tool.active ? 'text-blue-600' : theme.iconColor} />
        </button>
    </div>
{/snippet}

<div
    class="pdf-editor-touch-controls fixed z-70 transform transition-all duration-300 {toolbarPosition === 'bottom'
        ? 'bottom-6 left-1/2 max-w-[calc(100vw-1rem)] -translate-x-1/2'
        : toolbarPosition === 'left'
            ? 'top-1/2 left-4 max-h-[calc(100dvh-12rem)] -translate-y-1/2'
            : 'top-1/2 right-4 max-h-[calc(100dvh-12rem)] -translate-y-1/2'}"
>
    <div
        class="scrollbar-thin flex gap-1 rounded-xl border border-gray-200 bg-white px-2 py-2 shadow-2xl transition-all duration-300 {isToolButtons
            ? 'max-w-[calc(100vw-1rem)] items-center'
            : 'max-h-[calc(100dvh-12rem)] flex-col items-center'}"
    >
        <div class="hidden gap-1 md:flex {isToolButtons ? 'items-center' : 'flex-col items-center'}">
            {#each toolGroups as group, groupIdx}
                {#if groupIdx > 0}
                    <div class="bg-gray-300 self-center {isToolButtons ? 'mx-1 h-6 w-px' : 'my-1 h-px w-6'}"></div>
                {/if}

                {#each group as tool}
                    {#if (tool.show ?? true) && isToolEnabled(tool.toolKey)}
                        {@render toolButton(tool)}
                    {/if}
                {/each}
            {/each}
        </div>

        <div class="flex gap-1 md:hidden {isToolButtons ? 'items-center' : 'flex-col items-center'}">
            {#each toolGroups.slice(0, 3) as group, groupIdx}
                {#if groupIdx > 0}
                    <div class="bg-gray-300 self-center {isToolButtons ? 'mx-1 h-6 w-px' : 'my-1 h-px w-6'}"></div>
                {/if}

                {#each group as tool}
                    {#if mobileVisibleIds.has(tool.id) && isToolEnabled(tool.toolKey)}
                        {@render toolButton(tool)}
                    {/if}
                {/each}
            {/each}

            <div class="bg-gray-300 self-center {isToolButtons ? 'mx-1 h-6 w-px' : 'my-1 h-px w-6'}"></div>

            <ToolbarOverflow
                {enabledToolMap}
                {isAddingText}
                {addingDrawing}
                {isErasing}
                {isAddingLine}
                {isHighlighting}
                {isPointerMode}
                {isSelectionMode}
                {isHandMode}
                {allowTeacherMark}
                {selectedPageIndex}
                {isPageDisabled}
                {disabled}
                {isAddingDisabled}
                {onAddTextField}
                {onAddDrawing}
                {onErasing}
                {activateLineMode}
                {onHighlighting}
                {onPointerMode}
                {onSelectionMode}
                {onHandMode}
                {onTeacherMark}
            />
        </div>
    </div>
</div>

{#if !isMobile && hoveredTool && activeBtnRect}
    {@const theme = hoveredTool.theme ?? { border: 'border-blue-400', kbd: 'bg-blue-100 text-blue-600', iconColor: 'text-blue-500' }}
    {@const ToolIcon = hoveredTool.icon}

    <div 
        class="fixed z-80 pointer-events-none transition-all duration-150" 
        style={tooltipStyle}
    >
        <div class="max-w-xs rounded-lg border-2 {theme.border} bg-white px-3 py-2 text-black shadow-lg">
            <div>
                <div class="flex items-center justify-between gap-2 text-sm font-medium text-gray-800">
                    <div class="flex items-center gap-1.5 min-w-0">
                        <ToolIcon size={16} class="shrink-0 {theme.iconColor}" />
                        <span class="truncate">{hoveredTool.title}</span>
                    </div>

                    {#if hoveredTool.shortcut}
                        <span class="shrink-0 rounded px-1.5 py-0.5 text-xs font-semibold {theme.kbd}">
                            {hoveredTool.shortcut}
                        </span>
                    {/if}
                </div>

                <p class="mt-1 text-xs leading-tight text-gray-500">
                    {hoveredTool.description}
                </p>
            </div>
        </div>
    </div>
{/if}