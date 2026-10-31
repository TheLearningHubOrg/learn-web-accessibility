// Tabs with automatic activation and a roving tabindex.
// Only the selected tab has tabindex="0"; the others have tabindex="-1",
// so Tab moves from the tab list straight into the active panel.

/** @param {HTMLElement} tablist */
export function setupTabs(tablist) {
  const tabs = Array.from(tablist.querySelectorAll('[role="tab"]'));

  function select(tab, { focus = true } = {}) {
    for (const t of tabs) {
      const selected = t === tab;
      t.setAttribute('aria-selected', String(selected));
      t.tabIndex = selected ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !selected;
    }
    if (focus) tab.focus();
  }

  tablist.addEventListener('click', (event) => {
    const tab = event.target.closest('[role="tab"]');
    if (tab) select(tab);
  });

  tablist.addEventListener('keydown', (event) => {
    const current = tabs.indexOf(document.activeElement);
    if (current === -1) return;

    let next = null;
    switch (event.key) {
      case 'ArrowRight': next = (current + 1) % tabs.length; break;
      case 'ArrowLeft': next = (current - 1 + tabs.length) % tabs.length; break;
      case 'Home': next = 0; break;
      case 'End': next = tabs.length - 1; break;
      default: return; // Leave every other key (Tab, Enter, Space) to the browser.
    }
    event.preventDefault();
    select(tabs[next]);
  });

  return { select };
}

for (const tablist of document.querySelectorAll('[role="tablist"]')) {
  setupTabs(tablist);
}
