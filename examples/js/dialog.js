// Accessible modal dialog built on the native <dialog> element.
// showModal() makes the rest of the page inert, keeps Tab inside the dialog,
// and closes on Escape. We add explicit focus restoration and a result message.

/**
 * Wire a trigger button to a <dialog>.
 * @param {HTMLButtonElement} trigger
 * @param {HTMLDialogElement} dialog
 * @param {(returnValue: string) => void} onClose
 */
export function setupDialog(trigger, dialog, onClose) {
  let lastFocused = null;

  trigger.addEventListener('click', () => {
    lastFocused = document.activeElement;
    dialog.returnValue = '';
    dialog.showModal(); // Focus moves to the [autofocus] element (Cancel, the safe choice).
  });

  // Any button with data-close closes the dialog and reports its value.
  dialog.addEventListener('click', (event) => {
    const button = event.target.closest('[data-close]');
    if (button) dialog.close(button.dataset.close);
  });

  // 'close' fires for close() and for Escape (after the 'cancel' event).
  dialog.addEventListener('close', () => {
    onClose(dialog.returnValue || 'cancel');
    // Browsers restore focus on close, but be explicit so behaviour is predictable everywhere.
    if (lastFocused instanceof HTMLElement && lastFocused.isConnected) lastFocused.focus();
  });
}

const trigger = document.getElementById('open-delete');
const dialog = document.getElementById('delete-dialog');
const result = document.getElementById('dialog-result');

if (trigger && dialog && result) {
  setupDialog(trigger, dialog, (value) => {
    // role="status" is a polite live region, so this is announced without stealing focus.
    result.textContent = value === 'confirm' ? 'Project deleted.' : 'Deletion cancelled.';
  });
}
