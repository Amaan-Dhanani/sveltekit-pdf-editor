<script lang="ts">
    import type { Snippet } from 'svelte';
    import PDFEditorCore from './PDFEditorCore.svelte';
    import { defaultPdfEditorPlugins, type PdfEditorPlugin } from './plugins';
    import type { SaveState } from './context/pdfEditorContext.svelte';

    type SavingState = 'saving' | 'saved' | 'fail';
    type DisabledPageRange = { from_page: number; to_page: number };

    let {
        children,
        pageAnnotations = $bindable([]),
        pdfBlob = null,
        allowPrinting = true,
        ownerId = 'user1',
        user = undefined,
        fileName = '',
        savingState = 'saved',
        disabledPages = [],
        disabled_pages = undefined,
        disabled = false,
        currentPage = $bindable(1),
        saveState = undefined,
        autoSaveEnabled = undefined,
        plugins = defaultPdfEditorPlugins,
        allowTeacherMark = false,
        teacherMarkName = 'User',
        homework_info = undefined,
        isPageLoading = false,
        handleSave = undefined,
        handleComplete = undefined,
        onSaveAnnotations = undefined,
        onAnnotationChange = undefined,
        retryFailedSave = undefined,
        allObjects = $bindable([]),
        // Svelte 5 Callback Props
        onDataUpdated = undefined,
        onAnnotationsChange = undefined,
        onSave = undefined,
        onDone = undefined,
        onPageChange = undefined
    }: {
        children?: Snippet;
        pageAnnotations?: any[][];
        pdfBlob?: Blob | File | ArrayBuffer | Uint8Array | null;
        allowPrinting?: boolean;
        ownerId?: string;
        user?: string | undefined;
        fileName?: string;
        savingState?: SavingState;
        disabledPages?: DisabledPageRange[];
        disabled_pages?: DisabledPageRange[] | undefined;
        disabled?: boolean;
        currentPage?: number;
        saveState?: SaveState | undefined;
        autoSaveEnabled?: boolean | undefined;
        plugins?: PdfEditorPlugin[];
        allowTeacherMark?: boolean;
        teacherMarkName?: string;
        homework_info?: any;
        isPageLoading?: boolean;
        handleSave?: ((annotations: any[][]) => void | Promise<void>) | undefined;
        handleComplete?: ((annotations: any[][]) => void | Promise<void>) | undefined;
        onSaveAnnotations?: ((annotations: any[][]) => void | Promise<void>) | undefined;
        onAnnotationChange?: ((annotations: any[][]) => void) | undefined;
        retryFailedSave?: (() => void | Promise<void>) | undefined;
        allObjects?: any[];
        onDataUpdated?: ((payload: { newData: any[][]; annotations: any[][]; currentPage: number }) => void) | undefined;
        onAnnotationsChange?: ((payload: { annotations: any[][]; currentPage: number }) => void) | undefined;
        onSave?: ((payload: { annotations: any[][]; currentPage: number }) => void) | undefined;
        onDone?: ((payload: { newData: any[][]; annotations: any[][]; currentPage: number }) => void) | undefined;
        onPageChange?: ((payload: { page: number; annotations: any[] }) => void) | undefined;
    } = $props();

    // Internal Reactive State
    let internalAnnotations: any[][] = $state([]);
    let activePage = $state(Math.max(1, Number(currentPage || 1)));
    let lastAnnotationsRef = $state<any[][] | undefined>(undefined);
    let lastPdfBlobRef = $state<typeof pdfBlob>();
    let initialized = $state(false);
    let internalSaveState: SaveState | undefined = $state(undefined);
    
    // Internal flag to ignore echo-effects during local user edits / undo
    let isInternalUpdate = false;

    // Derived Values ($derived)
    let effectiveUser = $derived(user || ownerId || 'user1');
    let effectiveDisabledPages = $derived(disabled_pages || disabledPages || []);
    let computedSaveState = $derived(normalizeSavingState(savingState));
    let effectiveSaveState = $derived(saveState ?? internalSaveState ?? computedSaveState);
    let pdfInput = $derived(makePdfInput(pdfBlob));

    // Pure, synchronous adjacent annotations mapping ($derived.by)
    let adjacentPageAnnotations = $derived.by(() => {
        const map: Record<number, any[]> = {};
        internalAnnotations.forEach((objects, index) => {
            const page = index + 1;
            map[page] = page === activePage ? allObjects : objects;
        });
        return map;
    });

    // Helper Functions
    function cloneValue<T>(value: T): T {
        if (value == null) return value;
        if (typeof structuredClone === 'function') {
            try {
                return structuredClone(value);
            } catch {
                // fall through
            }
        }
        return JSON.parse(JSON.stringify(value));
    }

    function cloneObjects(objects: any[] | undefined) {
        return Array.isArray(objects) ? objects.map((object) => cloneValue(object)) : [];
    }

    function normalizeAnnotations(value: any, minPages = 0) {
        const pages = Array.isArray(value)
            ? value.map((objects) => cloneObjects(Array.isArray(objects) ? objects : []))
            : [];
        while (pages.length < minPages) pages.push([]);
        return pages;
    }

    function normalizeSavingState(state: SavingState): SaveState {
        if (state === 'saving') return { status: 'saving', hasUnsavedChanges: true };
        if (state === 'fail') return { status: 'fail', hasUnsavedChanges: true };
        return { status: 'saved', hasUnsavedChanges: false };
    }

    function makePdfInput(value: typeof pdfBlob) {
        if (!value) return value;
        if (typeof File !== 'undefined' && value instanceof File) return value;
        if (typeof Blob !== 'undefined' && value instanceof Blob && typeof File !== 'undefined') {
            return new File([value], fileName || 'document.pdf', {
                type: value.type || 'application/pdf'
            });
        }
        return value;
    }

    function ensurePage(page: number) {
        while (internalAnnotations.length < page) internalAnnotations.push([]);
    }

    function saveActivePage(objects = allObjects, page = activePage) {
        ensurePage(page);
        internalAnnotations[page - 1] = cloneObjects(objects);
    }

    function getAnnotationSnapshot(objects = allObjects, page = activePage) {
        const snapshot = normalizeAnnotations(internalAnnotations, page);
        snapshot[page - 1] = cloneObjects(objects);
        return snapshot;
    }

    function publishAnnotations(objects = allObjects, page = activePage) {
        const snapshot = getAnnotationSnapshot(objects, page);
        
        isInternalUpdate = true;
        pageAnnotations = snapshot;
        lastAnnotationsRef = snapshot;
        
        onDataUpdated?.({ newData: snapshot, annotations: snapshot, currentPage: activePage });
        onAnnotationsChange?.({ annotations: snapshot, currentPage: activePage });
        onAnnotationChange?.(snapshot);
        
        // Reset flag after microtask tick
        queueMicrotask(() => {
            isInternalUpdate = false;
        });
        
        return snapshot;
    }

    function loadPage(page: number) {
        activePage = Math.max(1, Number(page || 1));
        currentPage = activePage;
        ensurePage(activePage);
        allObjects = cloneObjects(internalAnnotations[activePage - 1]);
    }

    function hydrateFromProps() {
        activePage = Math.max(1, Number(currentPage || 1));
        internalAnnotations = normalizeAnnotations(pageAnnotations, activePage);
        loadPage(activePage);
    }

    function handleCoreAnnotationChange(currentObjects = allObjects) {
        // Do NOT re-clone allObjects directly here when bound via bind:allObjects
        saveActivePage(currentObjects);
        internalSaveState = { status: 'idle', hasUnsavedChanges: true };
        publishAnnotations(currentObjects);
    }

    async function handleCoreSave() {
        saveActivePage();
        internalSaveState = { status: 'saving', hasUnsavedChanges: true };
        const snapshot = publishAnnotations();
        try {
            await Promise.resolve(handleSave?.(snapshot));
            await Promise.resolve(onSaveAnnotations?.(snapshot));
            internalSaveState = { status: 'saved', hasUnsavedChanges: false };
            onSave?.({ annotations: snapshot, currentPage: activePage });
        } catch (error) {
            internalSaveState = { status: 'fail', hasUnsavedChanges: true };
            throw error;
        }
    }

    async function handleCoreComplete() {
        await handleCoreSave();
        const snapshot = getAnnotationSnapshot();
        await Promise.resolve(handleComplete?.(snapshot));
        onDone?.({ newData: snapshot, annotations: snapshot, currentPage: activePage });
    }

    function handleCorePageChange(page: number) {
        saveActivePage();
        publishAnnotations();
        loadPage(page);
        onPageChange?.({ page, annotations: cloneObjects(internalAnnotations[page - 1]) });
    }

    async function handleCoreRetry() {
        if (retryFailedSave) {
            await Promise.resolve(retryFailedSave());
            return;
        }
        await handleCoreSave();
    }

    function getAllPageAnnotations(currentObjects: any[], page: number) {
        saveActivePage(currentObjects, page);
        return getAnnotationSnapshot(currentObjects, page);
    }

    // Effect: Mount & Hydrate
    $effect(() => {
        if (!initialized) {
            initialized = true;
            lastAnnotationsRef = pageAnnotations;
            lastPdfBlobRef = pdfBlob;
            hydrateFromProps();
        }
    });

    // Effect: React to pdfBlob updates
    $effect(() => {
        if (!initialized) return;
        if (pdfBlob !== lastPdfBlobRef) {
            lastPdfBlobRef = pdfBlob;
            lastAnnotationsRef = pageAnnotations;
            hydrateFromProps();
        }
    });

    // Effect: React to pageAnnotations updates from external parent ONLY
    $effect(() => {
        if (!initialized) return;
        if (isInternalUpdate) return; // Skip if update originated locally
        
        if (pageAnnotations !== lastAnnotationsRef) {
            lastAnnotationsRef = pageAnnotations;
            internalAnnotations = normalizeAnnotations(pageAnnotations, activePage);
            loadPage(activePage);
        }
    });
</script>

{#if pdfInput}
    <PDFEditorCore
        bind:allObjects
        currentPage={activePage}
        pdfBlob={pdfInput}
        {allowPrinting}
        user={effectiveUser}
        saveState={effectiveSaveState}
        disabled_pages={effectiveDisabledPages}
        {disabled}
        {homework_info}
        {isPageLoading}
        {autoSaveEnabled}
        {allowTeacherMark}
        {teacherMarkName}
        {plugins}
        {adjacentPageAnnotations}
        onAnnotationChange={handleCoreAnnotationChange}
        handleSave={handleCoreSave}
        handleComplete={handleCoreComplete}
        retryFailedSave={handleCoreRetry}
        handlePageChange={handleCorePageChange}
        {getAllPageAnnotations}
    />
{:else}
    {@render children?.()}
{/if}