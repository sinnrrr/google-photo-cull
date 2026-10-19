// ==UserScript==
// @name         Google Photos Cull
// @namespace    google-photos-cull
// @version      1.0.0
// @description  Press d to select the current photo and advance to the next.
// @match        https://photos.google.com/*
// @run-at       document-start
// @grant        none
// @noframes
// ==/UserScript==

window.addEventListener('keydown', e => {
  if (e.key !== 'd' || e.repeat || e.isComposing ||
      e.ctrlKey || e.altKey || e.metaKey || e.shiftKey ||
      e.target?.isContentEditable || e.target?.closest?.('input, textarea, select') ||
      !location.pathname.includes('/photo/')) return;

  const box = document.querySelector('[role="checkbox"][aria-label="Select"]');
  if (!box) return;

  e.preventDefault();
  e.stopImmediatePropagation();

  if (box.getAttribute('aria-checked') !== 'true') box.click();
  document.querySelector('[aria-label="View next photo"]')?.click();
}, { capture: true });
