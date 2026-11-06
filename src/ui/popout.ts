export interface PopOutEnv {
  pip?: { requestWindow(o?: { width?: number; height?: number }): Promise<Window> } | undefined;
  open: (url: string, name: string, features: string) => Window | null;
}

export const POPOUT_SIZE = {
  expanded: { width: 344, height: 580 },
  collapsed: { width: 296, height: 96 },
};

/** Document Picture-in-Picture when available, otherwise a small popup window. Null if both fail (e.g. popup blocked). */
export async function openPopOut(
  env: PopOutEnv,
  size: { width: number; height: number },
): Promise<Window | null> {
  if (env.pip) {
    try {
      return await env.pip.requestWindow(size);
    } catch {
      // unsupported context or no user gesture: use the popup instead
    }
  }
  return env.open('', 'intonation-widget', `popup,width=${size.width},height=${size.height}`);
}

/** Copies the app's styles into the pop-out document (same-origin rules inline, others by link). */
export function copyStyles(from: Document, to: Document): void {
  for (const sheet of Array.from(from.styleSheets)) {
    try {
      const style = to.createElement('style');
      style.textContent = Array.from(sheet.cssRules)
        .map((r) => r.cssText)
        .join('\n');
      to.head.appendChild(style);
    } catch {
      if (sheet.href) {
        const link = to.createElement('link');
        link.rel = 'stylesheet';
        link.href = sheet.href;
        to.head.appendChild(link);
      }
    }
  }
}
