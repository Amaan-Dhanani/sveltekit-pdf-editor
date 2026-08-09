export function tapout(node: HTMLDivElement) {
  function handleTouchstart(event: TouchEvent) {
    if (!Array.from(event.touches).some((touch) => node.contains(touch.target as Node))) {
      node.dispatchEvent(new CustomEvent('tapout'));
    }
  }

  function handleMousedown(event: MouseEvent) {
    if (!node.contains(event.target as Node)) {
      node.dispatchEvent(new CustomEvent('tapout'));
    }
  }

  window.addEventListener('touchstart', handleTouchstart);
  window.addEventListener('mousedown', handleMousedown);

  return {
    destroy() {
      window.removeEventListener('touchstart', handleTouchstart);
      window.removeEventListener('mousedown', handleMousedown);
    },
  };
}