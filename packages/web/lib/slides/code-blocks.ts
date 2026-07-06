// Copy a code fence's contents to the clipboard from its "Copy" button.
// The button lives in the `.md-code-head` produced by `renderCode`; the code
// text is read from the sibling <code> (its textContent is the original,
// un-escaped source). Used by the in-app presenter; the standalone deck has its
// own inlined copy of this logic.
export function copyCodeFromButton(btn: HTMLElement): void {
  const code = btn.closest('.md-code-wrap')?.querySelector('code');
  if (!code || !navigator.clipboard) return;
  navigator.clipboard
    .writeText(code.textContent ?? '')
    .then(() => {
      const prev = btn.textContent;
      btn.textContent = 'Copied';
      btn.classList.add('copied');
      window.setTimeout(() => {
        btn.textContent = prev;
        btn.classList.remove('copied');
      }, 1400);
    })
    .catch(() => {
      /* clipboard blocked (e.g. insecure context) — nothing to do */
    });
}
