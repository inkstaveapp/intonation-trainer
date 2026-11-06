import { create } from 'zustand';
import { copyStyles, openPopOut, POPOUT_SIZE, type PopOutEnv } from '~/ui/popout';
import { setUiWindow } from '~/state/uiWindow';
import { useWidget } from '~/state/widget';

interface PopOutState {
  win: Window | null;
  /** The browser refused to open a window (e.g. popup blocker). */
  blocked: boolean;
  toggle: () => Promise<void>;
}

export const usePopOut = create<PopOutState>((set, get) => {
  const close = () => {
    const w = get().win;
    set({ win: null });
    setUiWindow(window);
    if (w && !w.closed) w.close();
  };
  window.addEventListener('pagehide', close);

  return {
    win: null,
    blocked: false,
    toggle: async () => {
      if (get().win) return close();
      const env: PopOutEnv = {
        pip: (window as unknown as { documentPictureInPicture?: PopOutEnv['pip'] })
          .documentPictureInPicture,
        open: (u, n, f) => window.open(u, n, f),
      };
      const size = useWidget.getState().collapsed ? POPOUT_SIZE.collapsed : POPOUT_SIZE.expanded;
      const w = await openPopOut(env, size);
      if (!w) return set({ blocked: true });
      copyStyles(document, w.document);
      w.document.documentElement.lang = document.documentElement.lang;
      w.document.title = document.title;
      w.document.body.style.margin = '0';
      w.addEventListener('pagehide', () => get().win === w && close());
      set({ win: w, blocked: false });
      setUiWindow(w);
    },
  };
});

/** Keep the pop-out window sized to the card or the pill. Browsers may refuse resizes; that is fine. */
useWidget.subscribe((s, prev) => {
  const w = usePopOut.getState().win;
  if (!w || s.collapsed === prev.collapsed) return;
  const size = s.collapsed ? POPOUT_SIZE.collapsed : POPOUT_SIZE.expanded;
  try {
    w.resizeTo(size.width, size.height);
  } catch {
    // ignored
  }
});
