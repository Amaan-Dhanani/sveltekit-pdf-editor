<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import { tapout } from './utils/tapout';

    const ZERO_WIDTH_SPACE = '\u200B';

    // -------------------------------------------------------------------------
    // Props
    // -------------------------------------------------------------------------

    let {
        size = $bindable(16),
        lineHeight = $bindable(1.2),
        x = $bindable(0),
        y = $bindable(0),
        fontFamily = $bindable(),
        fontColor = $bindable('#000000'),
        pageScale = 1,
        lines = $bindable(),
        width = 100,
        onTextSelected,
        onTextUnselected,
        onUpdateText,
        viewOnly = false,
        isPenMode = $bindable(false),
        isSelectionMode = $bindable(false),
        isSelected = false,
        isPreviewed = false,
        placeholder = 'Add text here.',
        shouldStartEditing = false
    }: {
        size?: number;
        lineHeight?: number;
        x?: number;
        y?: number;
        fontFamily?: string;
        fontColor?: string;
        pageScale?: number;
        lines?: string[];
        width?: number;
        onTextSelected?: (info: any) => void;
        onTextUnselected?: () => void;
        onUpdateText?: (info: {
            lines: string[];
            width: number;
        }) => void;
        viewOnly?: boolean;
        isPenMode?: boolean;
        isSelectionMode?: boolean;
        isSelected?: boolean;
        isPreviewed?: boolean;
        placeholder?: string;
        shouldStartEditing?: boolean;
    } = $props();

    // -------------------------------------------------------------------------
    // State
    // -------------------------------------------------------------------------

    let editable = $state<HTMLDivElement>();
    let operation = $state('');
    let debounceTimer = $state<ReturnType<typeof setTimeout> | null>(null);

    let showPlaceholder = $state(true);
    let isEditing = $state(false);

    let lastRenderedLinesSignature = '';

    // Editing and normal component selection use the exact same visual box.
    let showSelectionBox = $derived(isSelected || isEditing);

    // Keep border visually 3px regardless of page scale.
    let selectionBorderWidth = $derived(
        3 / Math.max(pageScale || 1, 0.0001)
    );

    let previewBorderWidth = $derived(
        2 / Math.max(pageScale || 1, 0.0001)
    );

    // -------------------------------------------------------------------------
    // Lines
    // -------------------------------------------------------------------------

    function normalizeLines(value: any = lines): string[] {
        return Array.isArray(value)
            ? value.map((line) =>
                  String(line ?? '').replaceAll(
                      ZERO_WIDTH_SPACE,
                      ''
                  )
              )
            : [];
    }

    function getLinesSignature(value: any = lines): string {
        return JSON.stringify(normalizeLines(value));
    }

    function isEmptyLinesValue(value: any = lines): boolean {
        const normalizedLines = normalizeLines(value);

        return (
            normalizedLines.length === 0 ||
            (normalizedLines.length === 1 &&
                normalizedLines[0].trim() === '')
        );
    }

    // -------------------------------------------------------------------------
    // Saving
    // -------------------------------------------------------------------------

    function clearDebounceTimer() {
        if (!debounceTimer) return;

        clearTimeout(debounceTimer);
        debounceTimer = null;
    }

    function commitTextUpdate() {
        if (!editable || operation !== 'edit') return;

        const extractedLines = extractLines();

        lastRenderedLinesSignature =
            getLinesSignature(extractedLines);

        onUpdateText?.({
            lines: extractedLines,
            width: editable.offsetWidth || 0
        });
    }

    function debouncedSave() {
        clearDebounceTimer();

        debounceTimer = setTimeout(() => {
            debounceTimer = null;
            commitTextUpdate();
        }, 500);
    }

    // -------------------------------------------------------------------------
    // Editing
    // -------------------------------------------------------------------------

    function notifyTextSelected() {
        onTextSelected?.({
            lineHeight,
            size,
            fontFamily,
            fontColor
        });
    }

    function onFocus() {
        if (!isEditing) {
            editable?.blur();
            return;
        }

        operation = 'edit';

        notifyTextSelected();
        updatePlaceholderVisibility();
    }

    function startEditing() {
        if (viewOnly) return;

        isEditing = true;
        operation = 'edit';
        isSelectionMode = false;

        notifyTextSelected();

        requestAnimationFrame(() => {
            editable?.focus();
        });
    }

    function handleDoubleClick(e: MouseEvent) {
        if (viewOnly) return;

        e.stopPropagation();

        startEditing();
    }

    $effect(() => {
        if (shouldStartEditing && !viewOnly) {
            startEditing();
        }
    });

    function onBlur() {
        if (operation !== 'edit') return;

        clearDebounceTimer();

        commitTextUpdate();

        operation = '';
        isEditing = false;

        updatePlaceholderVisibility();

        onTextUnselected?.();
    }

    // -------------------------------------------------------------------------
    // Placeholder
    // -------------------------------------------------------------------------

    function updatePlaceholderVisibility() {
        if (!editable) return;

        const text =
            editable.textContent
                ?.replaceAll(ZERO_WIDTH_SPACE, '')
                .trim() ?? '';

        const hasContent = text.length > 0;

        showPlaceholder =
            !hasContent &&
            isEmptyLinesValue() &&
            operation !== 'edit';
    }

    // -------------------------------------------------------------------------
    // Input
    // -------------------------------------------------------------------------

    function onInput() {
        updatePlaceholderVisibility();
        debouncedSave();
    }

    // -------------------------------------------------------------------------
    // Selection / caret helpers
    // -------------------------------------------------------------------------

    function getEditorSelection(): Range | null {
        if (!editable) return null;

        const selection = window.getSelection();

        if (!selection || selection.rangeCount === 0) {
            return null;
        }

        const range = selection.getRangeAt(0);

        if (!editable.contains(range.commonAncestorContainer)) {
            return null;
        }

        return range;
    }

    function placeCaretInTextNode(
        textNode: Text,
        offset = textNode.length
    ) {
        const selection = window.getSelection();

        if (!selection) return;

        const range = document.createRange();

        range.setStart(
            textNode,
            Math.min(offset, textNode.length)
        );

        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);
    }

    // -------------------------------------------------------------------------
    // Keyboard
    // -------------------------------------------------------------------------

    function onKeydown(e: KeyboardEvent) {
        if (!editable || !isEditing) return;

        if (e.key === 'Enter') {
            e.preventDefault();
            e.stopPropagation();

            const range = getEditorSelection();

            if (!range) return;

            // Delete selected text, if any.
            range.deleteContents();

            // Create the line break.
            const br = document.createElement('br');

            // A BR alone does not provide a reliable caret position
            // inside contenteditable. Give the browser a real text node.
            const caretNode = document.createTextNode(
                ZERO_WIDTH_SPACE
            );

            range.insertNode(br);

            br.parentNode?.insertBefore(
                caretNode,
                br.nextSibling
            );

            // Put the caret inside the invisible text node.
            placeCaretInTextNode(caretNode, 1);

            updatePlaceholderVisibility();

            requestAnimationFrame(() => {
                debouncedSave();
            });

            return;
        }

        requestAnimationFrame(() => {
            updatePlaceholderVisibility();
            debouncedSave();
        });
    }

    // -------------------------------------------------------------------------
    // Paste
    // -------------------------------------------------------------------------

    function onPaste(e: ClipboardEvent) {
        e.preventDefault();

        if (!editable || !isEditing) return;

        const pastedText =
            e.clipboardData?.getData('text/plain') || '';

        const range = getEditorSelection();

        if (!range) return;

        range.deleteContents();

        const normalizedText = pastedText.replace(
            /\r\n/g,
            '\n'
        );

        const pastedLines = normalizedText.split('\n');

        let finalCaretNode: Text | null = null;

        for (
            let index = 0;
            index < pastedLines.length;
            index++
        ) {
            const line = pastedLines[index];

            if (line.length > 0) {
                const textNode =
                    document.createTextNode(line);

                range.insertNode(textNode);

                range.setStartAfter(textNode);
                range.collapse(true);
            }

            if (index < pastedLines.length - 1) {
                const br = document.createElement('br');

                const caretNode =
                    document.createTextNode(
                        ZERO_WIDTH_SPACE
                    );

                range.insertNode(br);

                br.parentNode?.insertBefore(
                    caretNode,
                    br.nextSibling
                );

                finalCaretNode = caretNode;

                range.setStart(
                    caretNode,
                    caretNode.length
                );

                range.collapse(true);
            }
        }

        const selection = window.getSelection();

        if (selection) {
            selection.removeAllRanges();
            selection.addRange(range);
        } else if (finalCaretNode) {
            placeCaretInTextNode(finalCaretNode, 1);
        }

        updatePlaceholderVisibility();
        debouncedSave();
    }

    // -------------------------------------------------------------------------
    // Sanitization
    // -------------------------------------------------------------------------

    function sanitize() {
        if (!editable) return;

        let weirdNode: ChildNode | undefined;

        while (
            (weirdNode = Array.from(
                editable.childNodes
            ).find(
                (node) =>
                    !['#text', 'BR'].includes(
                        node.nodeName
                    )
            ))
        ) {
            editable.removeChild(weirdNode);
        }
    }

    // -------------------------------------------------------------------------
    // Extract lines
    // -------------------------------------------------------------------------

    function extractLines(): string[] {
        if (!editable) return [];

        const extractedLines: string[] = [];

        let lineText = '';

        for (const node of editable.childNodes) {
            if (node.nodeName === 'BR') {
                extractedLines.push(
                    lineText.replaceAll(
                        ZERO_WIDTH_SPACE,
                        ''
                    )
                );

                lineText = '';
            } else {
                lineText += node.textContent || '';
            }
        }

        extractedLines.push(
            lineText.replaceAll(
                ZERO_WIDTH_SPACE,
                ''
            )
        );

        return extractedLines;
    }

    // -------------------------------------------------------------------------
    // Render lines
    // -------------------------------------------------------------------------

    function renderLines() {
        if (!editable) return;

        const normalizedLines = normalizeLines();

        lastRenderedLinesSignature =
            getLinesSignature(normalizedLines);

        if (isEmptyLinesValue(normalizedLines)) {
            editable.innerHTML = '';

            updatePlaceholderVisibility();

            return;
        }

        const fragment =
            document.createDocumentFragment();

        normalizedLines.forEach((line, index) => {
            fragment.appendChild(
                document.createTextNode(line)
            );

            if (
                index <
                normalizedLines.length - 1
            ) {
                fragment.appendChild(
                    document.createElement('br')
                );
            }
        });

        editable.innerHTML = '';
        editable.appendChild(fragment);

        updatePlaceholderVisibility();
    }

    // Never overwrite the DOM while actively editing.
    $effect(() => {
        const linesSignature =
            getLinesSignature(lines);

        if (!editable || operation === 'edit') {
            return;
        }

        if (
            linesSignature !==
            lastRenderedLinesSignature
        ) {
            renderLines();
        } else {
            updatePlaceholderVisibility();
        }
    });

    // -------------------------------------------------------------------------
    // Tapout
    // -------------------------------------------------------------------------

    function handleTapout() {
        onBlur();
    }

    function tapoutEvents(node: HTMLElement) {
        node.addEventListener(
            'tapout',
            handleTapout
        );

        return {
            destroy() {
                node.removeEventListener(
                    'tapout',
                    handleTapout
                );
            }
        };
    }

    // -------------------------------------------------------------------------
    // Lifecycle
    // -------------------------------------------------------------------------

    function cleanup() {
        clearDebounceTimer();

        if (operation === 'edit') {
            commitTextUpdate();
        }

        operation = '';
        isEditing = false;
    }

    onMount(() => {
        renderLines();
        updatePlaceholderVisibility();

        // New empty text components immediately enter editing mode.
        if (
            !viewOnly &&
            isEmptyLinesValue()
        ) {
            isEditing = true;
            operation = 'edit';

            notifyTextSelected();

            requestAnimationFrame(() => {
                editable?.focus();
            });
        }
    });

    onDestroy(() => {
        cleanup();
    });
</script>

<!--
    IMPORTANT:

    The wrapper is `relative inline-block`.

    The selection rectangle is absolutely positioned against THIS wrapper,
    rather than being manually sized from getBoundingClientRect().

    This means:
      - the text determines the wrapper's natural size
      - the selection box automatically gets the same size
      - page/canvas transforms are applied only once
      - typing cannot progressively multiply the selection width
-->
<div
    use:tapout
    use:tapoutEvents
    role="presentation"
    class="absolute left-0 top-0 inline-block select-none"
    style:transform={`translate(${x}px, ${y}px)`}
    ondblclick={handleDoubleClick}
>
    <div class="relative inline-block">
        <!-- ================================================================
             Selection box

             Same box for normal selection and text editing.
             ================================================================ -->

        {#if showSelectionBox}
            <div
                aria-hidden="true"
                class="pointer-events-none absolute -inset-px z-0 rounded border border-blue-500/30"
                style:border-width={`${selectionBorderWidth}px`}
            ></div>
        {/if}

        <!-- ================================================================
             Preview box
             ================================================================ -->

        {#if isPreviewed}
            <div
                aria-hidden="true"
                class="pointer-events-none absolute -inset-px z-0 rounded border border-amber-600/80 bg-amber-500/10 animate-pulse"
                style:border-width={`${previewBorderWidth}px`}
            ></div>
        {/if}

        <!-- ================================================================
             Placeholder
             ================================================================ -->

        {#if !viewOnly && showPlaceholder}
            <div
                aria-hidden="true"
                class="pointer-events-none absolute inset-0 z-0 inline-block select-none overflow-hidden whitespace-nowrap text-gray-400"
                style="
                    font-size: {size}px;
                    font-family: {fontFamily
                        ? `'${fontFamily}', serif`
                        : 'serif'};
                    color: {fontColor};
                    line-height: {lineHeight || 1.2};
                "
            >
                {placeholder}
            </div>
        {/if}

        <!-- ================================================================
             Text editor
             ================================================================ -->

        <div
            aria-label="Text editor"
            role="textbox"
            tabindex="-1"
            bind:this={editable}
            onfocus={onFocus}
            onkeydown={onKeydown}
            onpaste={onPaste}
            oninput={onInput}
            contenteditable={!viewOnly && isEditing}
            spellcheck="false"
            class="
                relative
                z-10
                inline-block
                min-w-5
                whitespace-nowrap
                p-0
                m-0
                outline-none
            "
            class:cursor-text={!viewOnly && isEditing}
            class:cursor-default={viewOnly || !isEditing}
            style="
                font-size: {size}px;
                font-family: {fontFamily
                    ? `'${fontFamily}', serif`
                    : 'serif'};
                color: {fontColor};
                line-height: {lineHeight || 1.2};
                -webkit-user-select: {viewOnly || !isEditing
                    ? 'none'
                    : 'text'};
            "
        ></div>
    </div>
</div>