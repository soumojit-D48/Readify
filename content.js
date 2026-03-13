'use strict';

let highlightEnabled = false;
let highlightColor = '#ffef5c';
const HIGHLIGHT_CLASS = 'pagelens-highlight';

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  switch (message.type) {

    case 'GET_PAGE_DATA':
      sendResponse(collectPageData());
      break;

    case 'TOGGLE_HIGHLIGHT':
      highlightEnabled = message.enabled;
      highlightColor = message.color || highlightColor;
      if (highlightEnabled) {
        enableHighlightMode();
      } else {
        disableHighlightMode();
      }
      sendResponse({ ok: true });
      break;

    case 'SET_HIGHLIGHT_COLOR':
      highlightColor = message.color;
      sendResponse({ ok: true });
      break;

    case 'CLEAR_HIGHLIGHTS':
      clearAllHighlights();
      sendResponse({ ok: true });
      break;
  }

  return true;
});


function collectPageData() {
  const bodyText = document.body ? document.body.innerText || '' : '';
  const words = bodyText.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount = words.length;

  const readingTime = Math.max(1, Math.ceil(wordCount / 238));

  const imageCount = document.querySelectorAll('img').length;

  const linkSet = new Set();
  document.querySelectorAll('a[href]').forEach(a => {
    const href = a.href;
    if (href.startsWith('http://') || href.startsWith('https://')) {
      linkSet.add(href);
    }
  });
  const links = Array.from(linkSet).slice(0, 100);

  const metaEl = document.querySelector('meta[name="description"]');
  const metaDescription = metaEl ? metaEl.getAttribute('content') : null;

  return {
    title: document.title,
    url: window.location.href,
    wordCount,
    readingTime,
    imageCount,
    linkCount: linkSet.size,
    links,
    metaDescription
  };
}


function enableHighlightMode() {
  if (!document.getElementById('pagelens-styles')) {
    const style = document.createElement('style');
    style.id = 'pagelens-styles';
    style.textContent = `
      .pagelens-highlight {
        border-radius: 3px;
        cursor: pointer;
        transition: opacity 0.2s;
      }
      .pagelens-highlight:hover {
        opacity: 0.7;
      }
      body.pagelens-active {
        cursor: text !important;
      }
    `;
    document.head.appendChild(style);
  }

  document.body.classList.add('pagelens-active');
  document.addEventListener('mouseup', handleTextSelection);
}

function disableHighlightMode() {
  document.body.classList.remove('pagelens-active');
  document.removeEventListener('mouseup', handleTextSelection);
}

function handleTextSelection() {
  const selection = window.getSelection();
  if (!selection || selection.isCollapsed) return;

  const selectedText = selection.toString().trim();
  if (!selectedText) return;

  try {
    const range = selection.getRangeAt(0);
    const mark = document.createElement('mark');
    mark.className = HIGHLIGHT_CLASS;
    mark.style.backgroundColor = highlightColor;
    mark.style.color = '#000';
    mark.title = 'Readify highlight — click to remove';

    try {
      range.surroundContents(mark);
    } catch {
      const fragment = range.extractContents();
      mark.appendChild(fragment);
      range.insertNode(mark);
    }

    mark.addEventListener('click', (e) => {
      e.stopPropagation();
      unwrapHighlight(mark);
    });

    selection.removeAllRanges();

  } catch (err) {
    console.warn('Readify: Could not highlight selection', err);
  }
}

function unwrapHighlight(mark) {
  const parent = mark.parentNode;
  while (mark.firstChild) {
    parent.insertBefore(mark.firstChild, mark);
  }
  parent.removeChild(mark);
}

function clearAllHighlights() {
  document.querySelectorAll(`.${HIGHLIGHT_CLASS}`).forEach(mark => {
    unwrapHighlight(mark);
  });
}
