<script lang="ts">
    import MenuBar from './MenuBar.svelte';
    import CompactSaveIndicator from './CompactSaveIndicator.svelte';
    import PageNavigation from './PageNavigation.svelte';
    import { Save, Check, LoaderCircle } from '@lucide/svelte';
    import type { Component } from 'svelte';
    import type { RenderQualityMode, SaveState } from '../../context/pdfEditorContext.svelte';
    import { onMount } from 'svelte';

    interface Props {
        // Save state
        saveState: SaveState;

        // Page navigation
        internalPage: number;
        minPage: number;
        maxPage: number;
        itemsPerPage: number;
        isChangingPage: boolean;
        isPagePreviewOpen: boolean;

        // Menu bar props
        homework_info?: any;
        allowPrinting: boolean;
        pdfFile: File | undefined;
        saving: boolean;
        pages: any[];
        isFullscreen: boolean;
        stroke_visibility: string;
        zoom: number;
        zoomEnabled: boolean;
        doubleTapZoomEnabled: boolean;
        autoSaveEnabled: boolean;
        visibleObjectRenderingEnabled: boolean;
        minimapAnnotationsEnabled: boolean;
        adjacentPagePreviewEnabled: boolean;
        adjacentPagePreviewCount: number;
        adjacentPagePreviewLayout: 'row' | 'column';
        renderQualityMode: RenderQualityMode;
        isPageDisabled: boolean;
        isCompleting: boolean;

        // Handlers
        onRetryFailedSave: () => void;
        onNext: () => void;
        onPrev: () => void;
        onPageInput: (event: Event) => void;
        onBlur: () => void;
        onTogglePagePreview: () => void;
        onViewHomeworkInfo?: () => void;
        onPrint?: () => void;
        onToggleFullscreen: () => void;
        onStrokeVisibilityChange: (value: string) => void;
        onToggleZoom: () => void;
        onToggleDoubleTapZoom: () => void;
        onToggleAutoSave: () => void;
        onToggleVisibleObjectRendering: () => void;
        onToggleMinimapAnnotations: () => void;
        onToggleAdjacentPagePreview: () => void;
        onAdjacentPagePreviewCountChange: (value: number) => void;
        onAdjacentPagePreviewLayoutChange: (value: 'row' | 'column') => void;
        onRenderQualityModeChange: (mode: RenderQualityMode) => void;
        onSave: () => void | Promise<void>;
        onDone: () => void | Promise<void>;
    }

    let {
        saveState,
        internalPage,
        minPage,
        maxPage,
        itemsPerPage,
        isChangingPage,
        isPagePreviewOpen,
        homework_info,
        allowPrinting,
        pdfFile,
        saving,
        pages,
        isFullscreen,
        stroke_visibility,
        zoom,
        zoomEnabled,
        doubleTapZoomEnabled,
        autoSaveEnabled,
        visibleObjectRenderingEnabled,
        minimapAnnotationsEnabled,
        adjacentPagePreviewEnabled,
        adjacentPagePreviewCount,
        adjacentPagePreviewLayout,
        renderQualityMode,
        isPageDisabled,
        isCompleting,
        onRetryFailedSave,
        onNext,
        onPrev,
        onPageInput,
        onBlur,
        onTogglePagePreview,
        onViewHomeworkInfo,
        onPrint,
        onToggleFullscreen,
        onStrokeVisibilityChange,
        onToggleZoom,
        onToggleDoubleTapZoom,
        onToggleAutoSave,
        onToggleVisibleObjectRendering,
        onToggleMinimapAnnotations,
        onToggleAdjacentPagePreview,
        onAdjacentPagePreviewCountChange,
        onAdjacentPagePreviewLayoutChange,
        onRenderQualityModeChange,
        onSave,
        onDone
    }: Props = $props();

    interface TooltipConfig {
        id: string;
        icon: Component;
        title: string;
        description: string;
        shortcut?: string;
        theme: {
            border: string;
            kbd: string;
            iconColor: string;
        };
    }

    let isMobile = $state(false);
    let hoveredTool = $state<TooltipConfig | null>(null);
    let activeBtnRect = $state<DOMRect | null>(null);

    let isDoneProcessing = $derived(isCompleting || saveState.status === 'saving');
    let isDoneDisabled = $derived(isDoneProcessing || !pdfFile);
    let doneLabel = $derived(
        isCompleting ? 'Finishing...' : saveState.status === 'saving' ? 'Saving...' : 'Done'
    );

    const saveTooltip: TooltipConfig = {
        id: 'save',
        icon: Save,
        title: 'Save',
        description: 'Save current annotations',
        shortcut: 'Ctrl+S',
        theme: {
            border: 'border-amber-400',
            kbd: 'bg-amber-100 text-amber-700',
            iconColor: 'text-amber-500'
        }
    };

    const doneTooltip: TooltipConfig = {
        id: 'done',
        icon: Check,
        title: 'Done',
        description: 'Save and close the editor',
        theme: {
            border: 'border-emerald-400',
            kbd: 'bg-emerald-100 text-emerald-700',
            iconColor: 'text-emerald-500'
        }
    };

    function handleMouseEnter(e: MouseEvent, tool: TooltipConfig) {
        if (isMobile) return;
        const target = e.currentTarget as HTMLElement;
        activeBtnRect = target.getBoundingClientRect();
        hoveredTool = tool;
    }

    function handleMouseLeave() {
        hoveredTool = null;
        activeBtnRect = null;
    }

    // Dynamic absolute position relative to the top bar buttons
    let tooltipStyle = $derived.by(() => {
        if (!activeBtnRect) return '';
        const offset = 10; // Gap below the button
        return `top: ${activeBtnRect.bottom + offset}px; left: ${activeBtnRect.left + activeBtnRect.width / 2}px; transform: translateX(-50%);`;
    });

    onMount(() => {
        const checkMobile = () => {
            isMobile = window.innerWidth < 768 || 'ontouchstart' in window;
        };

        checkMobile();
        window.addEventListener('resize', checkMobile);

        return () => {
            window.removeEventListener('resize', checkMobile);
        };
    });
</script>

<div
    class="pdf-editor-touch-controls fixed top-4 right-0 left-0 z-100 px-4 max-[520px]:top-2 max-[520px]:px-2"
>
    <div
        class="top-bar-shell mx-auto flex max-w-[1600px] items-center justify-between gap-4 max-[520px]:flex-wrap max-[520px]:gap-2"
    >
        <div class="top-bar-left flex min-w-0 items-center gap-2">
            <MenuBar
                {homework_info}
                {allowPrinting}
                {pdfFile}
                {saving}
                {pages}
                {isFullscreen}
                {stroke_visibility}
                {zoomEnabled}
                {doubleTapZoomEnabled}
                {autoSaveEnabled}
                {visibleObjectRenderingEnabled}
                {minimapAnnotationsEnabled}
                {adjacentPagePreviewEnabled}
                {adjacentPagePreviewCount}
                {adjacentPagePreviewLayout}
                {renderQualityMode}
                {isPageDisabled}
                {onViewHomeworkInfo}
                {onPrint}
                {onToggleFullscreen}
                {onStrokeVisibilityChange}
                {onToggleZoom}
                {onToggleDoubleTapZoom}
                {onToggleAutoSave}
                {onToggleVisibleObjectRendering}
                {onToggleMinimapAnnotations}
                {onToggleAdjacentPagePreview}
                {onAdjacentPagePreviewCountChange}
                {onAdjacentPagePreviewLayoutChange}
                {onRenderQualityModeChange}
                {onSave}
            />
            <CompactSaveIndicator {saveState} onRetry={onRetryFailedSave} />
        </div>

        <div
            class="top-bar-center flex min-w-0 items-center gap-3 max-[520px]:order-3 max-[520px]:w-full max-[520px]:justify-center"
        >
            <PageNavigation
                {internalPage}
                {minPage}
                {maxPage}
                {itemsPerPage}
                {isChangingPage}
                {saveState}
                {isPagePreviewOpen}
                {onNext}
                {onPrev}
                {onPageInput}
                {onBlur}
                {onTogglePagePreview}
            />
        </div>

        <div class="top-bar-actions flex shrink-0 items-center gap-2 max-[520px]:ml-auto">
            <div
                role="tooltip"
                class="relative flex items-center justify-center"
                onmouseenter={(e) => handleMouseEnter(e, saveTooltip)}
                onmouseleave={handleMouseLeave}
            >
                <button
                    disabled={saveState.status === 'saving' || !pdfFile}
                    class="flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium shadow-md transition-all active:scale-95 max-[520px]:w-10 max-[520px]:px-0"
                    class:bg-amber-500={saveState.status !== 'saving' && pdfFile}
                    class:hover:bg-amber-600={saveState.status !== 'saving' && pdfFile}
                    class:text-white={saveState.status !== 'saving' && pdfFile}
                    class:bg-gray-200={saveState.status === 'saving' || !pdfFile}
                    class:text-gray-400={saveState.status === 'saving' || !pdfFile}
                    class:cursor-not-allowed={saveState.status === 'saving' || !pdfFile}
                    onclick={onSave}
                >
                    <Save size={16} class={saveState.status !== 'saving' && pdfFile ? 'text-amber-100' : 'text-gray-400'} />
                    <span class="hidden sm:inline">{saveState.status === 'saving' ? 'Saving...' : 'Save'}</span>
                </button>
            </div>

            <div
                role="tooltip"
                class="relative flex items-center justify-center"
                onmouseenter={(e) => handleMouseEnter(e, doneTooltip)}
                onmouseleave={handleMouseLeave}
            >
                <button
                    disabled={isDoneDisabled}
                    aria-busy={isDoneProcessing}
                    aria-label={doneLabel}
                    class="flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-sm font-medium shadow-md transition-all active:scale-95 max-[520px]:w-10 max-[520px]:px-0"
                    class:bg-emerald-500={!isDoneDisabled}
                    class:hover:bg-emerald-600={!isDoneDisabled}
                    class:text-white={!isDoneDisabled}
                    class:bg-gray-200={isDoneDisabled}
                    class:text-gray-400={isDoneDisabled}
                    class:cursor-not-allowed={isDoneDisabled}
                    onclick={onDone}
                >
                    {#if isDoneProcessing}
                        <LoaderCircle size={16} class="animate-spin text-emerald-100" />
                    {:else}
                        <Check size={16} class={!isDoneDisabled ? 'text-emerald-100' : 'text-gray-400'} />
                    {/if}
                    <span class="hidden sm:inline">{doneLabel}</span>
                </button>
            </div>
        </div>
    </div>
</div>

{#if !isMobile && hoveredTool && activeBtnRect}
    {@const theme = hoveredTool.theme}
    {@const ToolIcon = hoveredTool.icon}
    <div 
        class="fixed z-110 pointer-events-none transition-all duration-150" 
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