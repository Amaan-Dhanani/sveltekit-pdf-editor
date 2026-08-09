export function pannable(node: HTMLElement) {
    let x: number;
    let y: number;

    function handlePointerdown(event: PointerEvent) {
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        x = event.clientX;
        y = event.clientY;
        const target = event.target;

        node.dispatchEvent(
            new CustomEvent('panstart', {
                detail: { x, y, target }
            })
        );

        window.addEventListener('pointermove', handlePointermove);
        window.addEventListener('pointerup', handlePointerup);
    }

    function handlePointermove(event: PointerEvent) {
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        const dx = event.clientX - x;
        const dy = event.clientY - y;
        x = event.clientX;
        y = event.clientY;

        node.dispatchEvent(
            new CustomEvent('panmove', {
                detail: { x, y, dx, dy }
            })
        );
    }

    function handlePointerup(event: PointerEvent) {
        if (event.pointerType !== 'mouse' && event.pointerType !== 'pen') return;
        x = event.clientX;
        y = event.clientY;

        node.dispatchEvent(
            new CustomEvent('panend', {
                detail: { x, y }
            })
        );
        window.removeEventListener('pointermove', handlePointermove);
        window.removeEventListener('pointerup', handlePointerup);
    }

    function handleTouchStart(event: TouchEvent) {
        if (event.touches.length > 1) return;
        const touch = event.touches[0];
        x = touch.clientX;
        y = touch.clientY;
        const target = touch.target;

        node.dispatchEvent(
            new CustomEvent('panstart', {
                detail: { x, y, target }
            })
        );

        window.addEventListener('touchmove', handleTouchmove, { passive: false });
        window.addEventListener('touchend', handleTouchend);
        window.addEventListener('touchcancel', handleTouchcancel);
    }

    function handleTouchmove(event: TouchEvent) {
        event.preventDefault();
        if (event?.touches.length > 1) return;
        const touch = event?.touches[0];
        const dx = touch.clientX - x;
        const dy = touch.clientY - y;
        x = touch.clientX;
        y = touch.clientY;

        node.dispatchEvent(
            new CustomEvent('panmove', {
                detail: { x, y, dx, dy }
            })
        );
    }

    function handleTouchend(event: TouchEvent) {
        const touch = event.changedTouches[0];
        x = touch.clientX;
        y = touch.clientY;

        node.dispatchEvent(
            new CustomEvent('panend', {
                detail: { x, y }
            })
        );
        window.removeEventListener('touchmove', handleTouchmove);
        window.removeEventListener('touchend', handleTouchend);
        window.removeEventListener('touchcancel', handleTouchcancel);
    }

    function handleTouchcancel() {
        window.removeEventListener('touchmove', handleTouchmove);
        window.removeEventListener('touchend', handleTouchend);
        window.removeEventListener('touchcancel', handleTouchcancel);
        node.dispatchEvent(new CustomEvent('pancancel'));
    }

    function resetPointerLocks() {
        window.removeEventListener('pointermove', handlePointermove);
        window.removeEventListener('pointerup', handlePointerup);
        window.removeEventListener('touchmove', handleTouchmove);
        window.removeEventListener('touchend', handleTouchend);
        window.removeEventListener('touchcancel', handleTouchcancel);
    }

    node.addEventListener('pointerdown', handlePointerdown);
    node.addEventListener('touchstart', handleTouchStart);
    window.addEventListener('pdf-editor-reset-pointer-locks', resetPointerLocks);

    return {
        destroy() {
            node.removeEventListener('pointerdown', handlePointerdown);
            node.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('pdf-editor-reset-pointer-locks', resetPointerLocks);
            resetPointerLocks();
        }
    };
}