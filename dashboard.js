(() => {
  const tabs = [...document.querySelectorAll('[data-feed-tab]')];
  function selectFeed(selected) {
    tabs.forEach(tab => {
      const active = tab === selected;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      document.querySelector(`[data-feed-panel="${tab.dataset.feedTab}"]`).hidden = !active;
    });
  }
  tabs.forEach((tab, index) => {
    tab.addEventListener('click', () => selectFeed(tab));
    tab.addEventListener('keydown', event => {
      const next = { ArrowRight: (index + 1) % tabs.length, ArrowLeft: (index + tabs.length - 1) % tabs.length, Home: 0, End: tabs.length - 1 }[event.key];
      if (next === undefined) return;
      event.preventDefault();
      selectFeed(tabs[next]);
      tabs[next].focus();
    });
  });
  for (const feed of ['news', 'deals']) {
    const list = document.querySelector(`#${feed}List`);
    const button = document.querySelector(`[data-show-more="${feed}"]`);
    let limit = 5;
    let previousRows = [];
    function update() {
      const rows = [...list.children].filter(row => !row.classList.contains('skeleton'));
      // A replacement batch resets disclosure; individual article dismissals do not.
      if (!rows.some(row => previousRows.includes(row))) limit = 5;
      rows.forEach((row, index) => { row.hidden = index >= limit; });
      button.hidden = rows.length <= limit;
      previousRows = rows;
    }
    button.addEventListener('click', () => { limit += 5; update(); });
    new MutationObserver(update).observe(list, { childList: true });
    update();
  }
})();
