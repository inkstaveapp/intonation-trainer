import { describe, expect, it, vi } from 'vitest';
import { openPopOut } from '~/ui/popout';

const win = (name: string) => ({ name }) as unknown as Window;
const size = { width: 344, height: 500 };

describe('openPopOut', () => {
  it('prefers Document Picture-in-Picture', async () => {
    const open = vi.fn();
    const pip = { requestWindow: vi.fn().mockResolvedValue(win('pip')) };
    expect(await openPopOut({ pip, open }, size)).toEqual(win('pip'));
    expect(pip.requestWindow).toHaveBeenCalledWith(size);
    expect(open).not.toHaveBeenCalled();
  });

  it('falls back to a popup when PiP is missing or rejects', async () => {
    const open = vi.fn().mockReturnValue(win('popup'));
    expect(await openPopOut({ open }, size)).toEqual(win('popup'));
    const pip = { requestWindow: vi.fn().mockRejectedValue(new Error('no gesture')) };
    expect(await openPopOut({ pip, open }, size)).toEqual(win('popup'));
    expect(open).toHaveBeenLastCalledWith('', 'intonation-widget', 'popup,width=344,height=500');
  });

  it('returns null when the popup is blocked', async () => {
    expect(await openPopOut({ open: () => null }, size)).toBeNull();
  });
});
