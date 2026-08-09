<script lang="ts">
    import { onMount, onDestroy } from 'svelte';
    import {
        hitTestDrawingWithBox,
        findDrawingsAtPoint,
        lineIntersectsBox,
        type Point,
        type BBox,
        type DrawingObject
    } from './utils/hitTest';
    import { createObjectSpatialIndex, type SpatialIndexObject } from './utils/spatialIndex';

    let {
        isDraggingSelection,
        pageScale,
        allObjects,
        selectedObjectIds = $bindable([]),
        onSelectionChange,
        onLassoComplete,
        onSelectionActiveChange,
        onTextDoubleClick,
        onLineDoubleClick,
        allowTeacherMark = false,
        isPenMode = $bindable(false)
    } = $props();

    // Fix 1: Properly type canvas element
    let canvas = $state<HTMLDivElement | null>(null);
    let isSelecting = $state(false);
    let selectionBox = $state({ x: 0, y: 0, width: 0, height: 0 });
    let startPoint = { x: 0, y: 0 };
    let activeCanvasRect: Record<string, any> | null = null;
    let pendingSelectionBox: { x: number; y: number; width: number; height: number } | null = null;
    let selectionFrame: number | null = null;

    let objectById = $derived.by(() => {
        const byId = new Map();
        for (const object of allObjects || []) {
            if (object?.id) byId.set(String(object.id), object);
        }
        return byId;
    });

    let objectSpatialIndex = $derived.by(() => createObjectSpatialIndex(allObjects || []));
    let selectedObjectIdSet = $derived.by(() => new Set(selectedObjectIds));

    // Click tracking state for custom double-click detection
    let lastClickedItemId = $state<string | number | null>(null);
    let lastClickTime = $state(0);
    let lastClickPosition = $state({ x: 0, y: 0 });
    const DOUBLE_CLICK_TIME_THRESHOLD = 400; // milliseconds
    const DOUBLE_CLICK_POSITION_THRESHOLD = 15; // pixels

    function getObjectById(id: string) {
        return id ? objectById.get(id) : undefined;
    }

    function isSelectedObjectId(id: string) {
        return id ? selectedObjectIdSet.has(id) : false;
    }

    function findObjectsAtPoint(point: Point) {
        const candidates = objectSpatialIndex.queryPoint(
            point.x,
            point.y,
            6 / Math.max(pageScale || 1, 0.1)
        );
        return findDrawingsAtPoint(point, allObjects, pageScale, candidates);
    }

    onMount(() => {
        window.addEventListener('pdf-editor-reset-pointer-locks', resetPointerLocks);
    });

    onDestroy(() => {
        window.removeEventListener('pdf-editor-reset-pointer-locks', resetPointerLocks);
        cancelSelectionFrame();
    });

    // Custom pannable action that respects isPenMode
    function selectionPannable(node: HTMLDivElement) {
        let startX: number, startY: number;
        let isActive = false;
        let shouldHandle = false;

        // Fix 2: Use DOM Event union types for event helpers
        function getEventCoords(event: PointerEvent | MouseEvent | TouchEvent) {
            if ('touches' in event && event.touches.length > 0) {
                return { x: event.touches[0].clientX, y: event.touches[0].clientY };
            } else if ('changedTouches' in event && event.changedTouches.length > 0) {
                return { x: event.changedTouches[0].clientX, y: event.changedTouches[0].clientY };
            } else if ('clientX' in event) {
                return { x: event.clientX, y: event.clientY };
            }
            return { x: 0, y: 0 };
        }

        function isPenEvent(event: PointerEvent | MouseEvent | TouchEvent) {
            if ('pointerType' in event) {
                return event.pointerType === 'pen';
            }
            if ('touches' in event && event.touches[0]) {
                return (event.touches[0] as unknown as { touchType?: string }).touchType === 'stylus';
            }
            return false;
        }

        function isMultiTouchEvent(event: PointerEvent | MouseEvent | TouchEvent) {
            return 'touches' in event && event.touches.length > 1;
        }

        function isTouchPointerEvent(event: PointerEvent | MouseEvent | TouchEvent) {
            return event.type.startsWith('pointer') && 'pointerType' in event && event.pointerType === 'touch';
        }

        function cancelActiveSelection() {
            if (!isActive) return;

            isActive = false;
            shouldHandle = false;
            node.dispatchEvent(new CustomEvent('selectioncancel'));
        }

        function shouldHandleEvent(coords: { x: number; y: number }) {
            if (isDraggingSelection) return false;

            const canvasRect = canvas?.getBoundingClientRect();
            if (!canvasRect) return true;

            const x = (coords.x - canvasRect.left) / pageScale;
            const y = (coords.y - canvasRect.top) / pageScale;
            const clickPoint = { x, y };

            const hitObjectIds = findObjectsAtPoint(clickPoint);
            const topHitObject = getObjectById(hitObjectIds[hitObjectIds.length - 1]);
            if (topHitObject?.type === 'teacher-mark' && !allowTeacherMark) {
                return false;
            }

            for (const hitId of hitObjectIds) {
                if (isSelectedObjectId(hitId)) {
                    const obj = getObjectById(hitId);
                    if (obj && obj.type === 'text') {
                        continue;
                    }
                    return false;
                }
            }
            return true;
        }

        function handleStart(event: PointerEvent | MouseEvent | TouchEvent) {
            if (isTouchPointerEvent(event)) return;

            if (isMultiTouchEvent(event)) {
                cancelActiveSelection();
                return;
            }

            if (isPenMode && !isPenEvent(event)) {
                if (event.type === 'touchstart') {
                    event.preventDefault();
                }
                return;
            }
            if (isPenEvent(event)) isPenMode = true;

            const coords = getEventCoords(event);
            shouldHandle = shouldHandleEvent(coords);

            if (!shouldHandle) {
                const isMousePointer = event.type === 'pointerdown' && 'pointerType' in event && event.pointerType === 'mouse';
                const isMouseEvent = event.type === 'mousedown';

                if (!isMousePointer && !isMouseEvent) {
                    event.preventDefault();
                }
                return;
            }

            const canvasRect = canvas?.getBoundingClientRect();
            if (canvasRect) {
                const x = (coords.x - canvasRect.left) / pageScale;
                const y = (coords.y - canvasRect.top) / pageScale;
                const clickPoint = { x, y };
                const hitObjectIds = findObjectsAtPoint(clickPoint);

                const clickedOnText = hitObjectIds.some((id) => {
                    const obj = getObjectById(id);
                    return obj && obj.type === 'text';
                });

                if (clickedOnText) {
                    return;
                }
            }

            event.preventDefault();
            isActive = true;
            startX = coords.x;
            startY = coords.y;

            node.dispatchEvent(
                new CustomEvent('selectionstart', {
                    detail: { x: coords.x, y: coords.y, target: event.target }
                })
            );
        }

        function handleMove(event: PointerEvent | MouseEvent | TouchEvent) {
            if (isTouchPointerEvent(event)) return;

            if (isMultiTouchEvent(event)) {
                cancelActiveSelection();
                return;
            }

            if (isDraggingSelection) {
                const isMousePointer = event.type === 'pointermove' && 'pointerType' in event && event.pointerType === 'mouse';
                const isMouseEvent = event.type === 'mousemove';

                if (!isMousePointer && !isMouseEvent) {
                    event.preventDefault();
                }
                return;
            }

            if (!isActive) return;

            if (isPenMode && !isPenEvent(event)) {
                if (event.type === 'touchmove') {
                    event.preventDefault();
                }
                return;
            }

            event.preventDefault();
            const coords = getEventCoords(event);

            node.dispatchEvent(
                new CustomEvent('selectionmove', {
                    detail: {
                        x: coords.x,
                        y: coords.y,
                        dx: coords.x - startX,
                        dy: coords.y - startY
                    }
                })
            );
        }

        function handleEnd(event: PointerEvent | MouseEvent | TouchEvent) {
            if (isTouchPointerEvent(event)) return;

            if (isDraggingSelection) {
                const isMousePointer =
                    (event.type === 'pointerup' || event.type === 'pointercancel') &&
                    'pointerType' in event &&
                    event.pointerType === 'mouse';
                const isMouseEvent = event.type === 'mouseup' || event.type === 'mouseleave';

                if (!isMousePointer && !isMouseEvent) {
                    event.preventDefault();
                }
                return;
            }

            if (!isActive) return;

            if (isPenMode && !isPenEvent(event)) {
                if (event.type === 'touchend' || event.type === 'touchcancel') {
                    event.preventDefault();
                }
                return;
            }

            event.preventDefault();
            isActive = false;
            shouldHandle = false;
            const coords = getEventCoords(event);

            node.dispatchEvent(
                new CustomEvent('selectionend', {
                    detail: { x: coords.x, y: coords.y }
                })
            );
        }

        node.addEventListener('pointerdown', handleStart as EventListener);
        node.addEventListener('pointermove', handleMove as EventListener);
        node.addEventListener('pointerup', handleEnd as EventListener);
        node.addEventListener('pointercancel', handleEnd as EventListener);

        node.addEventListener('touchstart', handleStart as EventListener, { passive: false });
        node.addEventListener('touchmove', handleMove as EventListener, { passive: false });
        node.addEventListener('touchend', handleEnd as EventListener, { passive: false });
        node.addEventListener('touchcancel', handleEnd as EventListener, { passive: false });

        node.addEventListener('mousedown', handleStart as EventListener);
        node.addEventListener('mousemove', handleMove as EventListener);
        node.addEventListener('mouseup', handleEnd as EventListener);
        node.addEventListener('mouseleave', handleEnd as EventListener);
        window.addEventListener('pdf-editor-reset-pointer-locks', cancelActiveSelection);

        return {
            destroy() {
                node.removeEventListener('pointerdown', handleStart as EventListener);
                node.removeEventListener('pointermove', handleMove as EventListener);
                node.removeEventListener('pointerup', handleEnd as EventListener);
                node.removeEventListener('pointercancel', handleEnd as EventListener);

                node.removeEventListener('touchstart', handleStart as EventListener);
                node.removeEventListener('touchmove', handleMove as EventListener);
                node.removeEventListener('touchend', handleEnd as EventListener);
                node.removeEventListener('touchcancel', handleEnd as EventListener);

                node.removeEventListener('mousedown', handleStart as EventListener);
                node.removeEventListener('mousemove', handleMove as EventListener);
                node.removeEventListener('mouseup', handleEnd as EventListener);
                node.removeEventListener('mouseleave', handleEnd as EventListener);
                window.removeEventListener('pdf-editor-reset-pointer-locks', cancelActiveSelection);
            }
        };
    }

    function resetPointerLocks() {
        isSelecting = false;
        onSelectionActiveChange?.(false);
        cancelSelectionFrame();
        activeCanvasRect = null;
        pendingSelectionBox = null;
        selectionBox = { x: 0, y: 0, width: 0, height: 0 };
        lastClickedItemId = null;
        lastClickTime = 0;
        lastClickPosition = { x: 0, y: 0 };
    }

    function cancelSelectionFrame() {
        if (selectionFrame === null || typeof cancelAnimationFrame === 'undefined') return;

        cancelAnimationFrame(selectionFrame);
        selectionFrame = null;
    }

    function areIdArraysEqual(a: any[] = [], b: any[] = []) {
        if (a.length !== b.length) return false;

        for (let index = 0; index < a.length; index += 1) {
            if (a[index] !== b[index]) return false;
        }

        return true;
    }

    function applySelectionBox(box: { x: number; y: number; width: number; height: number } | undefined) {
        pendingSelectionBox = null;
        if (box) {
            selectionBox = box;
            updateSelection(box);
        }
    }

    function scheduleSelectionUpdate(box: { x: number; y: number; width: number; height: number } | null) {
        pendingSelectionBox = box;

        if (typeof requestAnimationFrame === 'undefined') {
            if (box) applySelectionBox(box);
            return;
        }

        if (selectionFrame !== null) return;

        selectionFrame = requestAnimationFrame(() => {
            selectionFrame = null;
            if (!pendingSelectionBox || !isSelecting) return;
            applySelectionBox(pendingSelectionBox);
        });
    }

    function flushSelectionUpdate() {
        if (selectionFrame !== null && typeof cancelAnimationFrame !== 'undefined') {
            cancelAnimationFrame(selectionFrame);
            selectionFrame = null;
        }

        if (pendingSelectionBox) {
            applySelectionBox(pendingSelectionBox);
            return;
        }

        updateSelection(selectionBox);
    }

    function handleSelectionStart(event: CustomEvent<{ target: unknown; x: number; y: number }>) {
        if (event.detail.target !== canvas) return;

        if (isDraggingSelection) return;

        activeCanvasRect = canvas?.getBoundingClientRect() || null;
        if (!activeCanvasRect) return;

        const x = (event.detail.x - activeCanvasRect.left) / pageScale;
        const y = (event.detail.y - activeCanvasRect.top) / pageScale;

        isSelecting = true;
        onSelectionActiveChange?.(true);
        startPoint = { x, y };
        pendingSelectionBox = null;
        selectionBox = { x, y, width: 0, height: 0 };
    }

    function handleSelectionMove(event: CustomEvent<{ x: number; y: number }>) {
        if (!isSelecting) return;

        const canvasRect = activeCanvasRect || canvas?.getBoundingClientRect();
        if (!canvasRect) return;
        activeCanvasRect = canvasRect;

        const currentX = (event.detail.x - canvasRect.left) / pageScale;
        const currentY = (event.detail.y - canvasRect.top) / pageScale;

        const minX = Math.min(startPoint.x, currentX);
        const minY = Math.min(startPoint.y, currentY);
        const maxX = Math.max(startPoint.x, currentX);
        const maxY = Math.max(startPoint.y, currentY);

        const nextSelectionBox = {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };

        scheduleSelectionUpdate(nextSelectionBox);
    }

    function handleSelectionEnd() {
        flushSelectionUpdate();
        const wasLassoSelection = isSelecting && (selectionBox.width > 5 || selectionBox.height > 5);

        isSelecting = false;
        onSelectionActiveChange?.(false);
        activeCanvasRect = null;

        if (wasLassoSelection && onLassoComplete) {
            onLassoComplete();
        }
    }

    function handleSelectionCancel() {
        isSelecting = false;
        onSelectionActiveChange?.(false);
        cancelSelectionFrame();
        activeCanvasRect = null;
        pendingSelectionBox = null;
        selectionBox = { x: 0, y: 0, width: 0, height: 0 };
    }

    function updateSelection(box = selectionBox) {
        const selected: any[] = [];
        const candidates = objectSpatialIndex.queryBox(
            box,
            6 / Math.max(pageScale || 1, 0.1)
        );

        for (const obj of candidates) {
            if (isSelectableObject(obj) && isObjectInSelectionBox(obj, box)) {
                selected.push(obj.id);
            }
        }

        if (areIdArraysEqual(selectedObjectIds, selected)) return;

        selectedObjectIds = selected;
        if (onSelectionChange) {
            onSelectionChange(selected);
        }
    }

    function isSelectableObject(obj: any) {
        return obj && (allowTeacherMark || obj.type !== 'teacher-mark');
    }

    function isObjectInSelectionBox(obj: any, box: BBox) {
        if (obj.type === 'text') {
            const textBox = {
                x: obj.x,
                y: obj.y,
                width: obj.width || 100,
                height: (obj.lines?.length || 1) * (obj.size || 16) * (obj.lineHeight || 1.2)
            };
            return boxesIntersect(textBox, box);
        } else if (obj.type === 'drawing' || obj.type === 'highlight') {
            return hitTestDrawingWithBox(box, obj);
        } else if (obj.type === 'line') {
            return lineIntersectsBox(obj.x, obj.y, obj.width, obj.height, box, obj.strokeWidth || 2);
        } else if (obj.type === 'teacher-mark') {
            const markBox = {
                x: obj.x,
                y: obj.y,
                width: obj.width || 60,
                height: obj.height || 40
            };
            return boxesIntersect(markBox, box);
        }
        return false;
    }

    function boxesIntersect(box1: any, box2: any) {
        return !(
            box1.x + box1.width < box2.x ||
            box2.x + box2.width < box1.x ||
            box1.y + box1.height < box2.y ||
            box2.y + box2.height < box1.y
        );
    }
</script>

<div
    bind:this={canvas}
    use:selectionPannable
    {...{
        onselectionstart: handleSelectionStart,
        onselectionmove: handleSelectionMove,
        onselectionend: handleSelectionEnd,
        onselectioncancel: handleSelectionCancel
    }}
    onclick={(e: MouseEvent) => {
        const canvasRect = canvas?.getBoundingClientRect();
        if (!canvasRect) return;

        const x = (e.clientX - canvasRect.left) / pageScale;
        const y = (e.clientY - canvasRect.top) / pageScale;
        const clickPoint = { x, y };

        const hitObjectIds = findObjectsAtPoint(clickPoint);
        const topHitObject = getObjectById(hitObjectIds[hitObjectIds.length - 1]);
        if (topHitObject?.type === 'teacher-mark' && !allowTeacherMark) {
            lastClickedItemId = null;
            lastClickTime = 0;
            lastClickPosition = { x: 0, y: 0 };
            return;
        }

        let clickedObject = null;
        let clickedType = null;

        for (const hitId of hitObjectIds) {
            const obj = getObjectById(hitId);
            if (!isSelectableObject(obj)) {
                continue;
            }
            if (obj && obj.type === 'text') {
                clickedObject = obj;
                clickedType = 'text';
                break;
            } else if (obj && obj.type === 'line' && !clickedObject) {
                clickedObject = obj;
                clickedType = 'line';
            }
        }

        if (clickedObject) {
            const currentTime = Date.now();
            const timeDiff = currentTime - lastClickTime;
            const distance = Math.sqrt((x - lastClickPosition.x) ** 2 + (y - lastClickPosition.y) ** 2);

            const isSameItem = lastClickedItemId === clickedObject.id;
            const isWithinTimeThreshold = timeDiff <= DOUBLE_CLICK_TIME_THRESHOLD;
            const isWithinPositionThreshold = distance <= DOUBLE_CLICK_POSITION_THRESHOLD;

            if (isSameItem && isWithinTimeThreshold && isWithinPositionThreshold) {
                if (clickedType === 'text' && onTextDoubleClick) {
                    onTextDoubleClick(clickedObject.id);
                } else if (clickedType === 'line' && onLineDoubleClick) {
                    onLineDoubleClick(clickedObject.id);
                }
            }

            lastClickedItemId = clickedObject.id;
            lastClickTime = currentTime;
            lastClickPosition = { x, y };
        } else {
            lastClickedItemId = null;
            lastClickTime = 0;
            lastClickPosition = { x, y };
        }
    }}
    class="absolute top-0 left-0 h-full w-full select-none"
    style="cursor: default; pointer-events: auto;"
>
    {#if isSelecting && selectionBox.width > 0 && selectionBox.height > 0}
        <div
            class="pointer-events-none absolute"
            style="
                left: {selectionBox.x * pageScale}px;
                top: {selectionBox.y * pageScale}px;
                width: {selectionBox.width * pageScale}px;
                height: {selectionBox.height * pageScale}px;
                border: 2px solid rgba(59, 130, 246, 0.8);
                background-color: rgba(59, 130, 246, 0.1);
            "
        ></div>
    {/if}
</div>