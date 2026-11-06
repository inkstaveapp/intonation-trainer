/**
 * The window whose animation frames drive the UI. A hidden main tab gets no requestAnimationFrame,
 * so while the widget is popped out, the pop-out window drives the display instead.
 */
let current: Window | null = null; // null means the main window; resolved lazily so importing this never touches `window`
const listeners = new Set<() => void>();

export const getUiWindow = (): Window => current ?? window;

export function setUiWindow(w: Window): void {
  current = w;
  listeners.forEach((fn) => fn());
}

export const subscribeUiWindow = (fn: () => void): (() => void) => {
  listeners.add(fn);
  return () => void listeners.delete(fn);
};
