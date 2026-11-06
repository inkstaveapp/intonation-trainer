/**
 * Browser download of a text file. The only browser-specific piece of exporting: in a Capacitor app,
 * replace this with Filesystem + Share and keep the CSV builders as they are.
 */
export function downloadText(name: string, text: string, mime = 'text/csv;charset=utf-8'): void {
  // The BOM makes Excel read the file as UTF-8 (the ♯ and ♭ in note names survive).
  const url = URL.createObjectURL(new Blob(['﻿', text], { type: mime }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
