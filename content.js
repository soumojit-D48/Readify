'use strict';

// State 
let highlightEnabled = false;
let highlightColor = '#ffef5c';
const HIGHLIGHT_CLASS = 'pagelens-highlight';

// READING PROGRESS BAR
function initProgressbar() {
  const bar = document.createElement('div');
  bar.id = 'pagelens-highlight';
  bar.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 0%;
    height: 3px;
    background: linear-gradient(90deg, #6c63ff, #3ecfcf);
    z-index: 999999;
    transition: width 0.1s ease;
    pointer-events: none;
  `

  document.documentElement.appendChild(bar);

  window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const docHeight = document.documentElement.scrollHeight - window.innerHeight;
    const progress = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
    bar.style.width = Math.min(progress, 100) + '%';
  }, { passive: true });
}

// Run immediately when content script loads
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initProgressbar);
} else {
  initProgressbar();
}

// Message Listener
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

    case 'TOGGLE_DARK_MODE':
      const html = document.documentElement;
      const isDark = html.style.filter.includes('invert');
      
      if (isDark) {
        html.style.filter = '';
        const fix = document.getElementById('pagelens-dark-fix');
        if (fix) fix.remove();
      } else {
        html.style.filter = 'invert(1) hue-rotate(180deg)';
        html.style.transition = 'filter 0.3s ease';
        if (!document.getElementById('pagelens-dark-fix')) {
          const style = document.createElement('style');
          style.id = 'pagelens-dark-fix';
          style.textContent = `
        img, video, iframe, canvas, picture {
          filter: invert(1) hue-rotate(180deg) !important;
        }
      `;
          document.head.appendChild(style);
        }
      }
      sendResponse({ ok: true, isDarkMode: !isDark });
      break;
  }

  return true;
});


// COLLECT PAGE DATA
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


// HIGHLIGHT MODE
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
