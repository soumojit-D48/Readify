'use strict';

let currentTabId = null;
let pageData = null;
let highlightEnabled = false;
let selectedColor = '#ffef5c';

document.addEventListener('DOMContentLoaded', async () => {

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTabId = tab.id;

  setupTabs();
  await loadPageData();
  setupHighlightPanel();
  setupStoragePanel();
});


function setupTabs() {
  document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.getElementById(`panel-${tab.dataset.tab}`).classList.add('active');

      if (tab.dataset.tab === 'links') renderLinks();
      if (tab.dataset.tab === 'storage') loadSavedPages();
    });
  });
}


async function loadPageData() {
  try {
    const response = await chrome.tabs.sendMessage(currentTabId, {
      type: 'GET_PAGE_DATA'
    });

    pageData = response;
    renderStats(response);

  } catch (err) {
    document.getElementById('stats-loading').innerHTML =
      `<div style="color:#ff7eb3;font-size:12px">⚠️ Cannot analyze this page.<br>Try a regular website.</div>`;
    console.error('Readify error:', err);
  }
}


function renderStats(data) {
  document.getElementById('stats-loading').style.display = 'none';
  document.getElementById('stats-content').style.display = 'block';

  document.getElementById('stat-words').textContent = fmt(data.wordCount);
  document.getElementById('stat-read-min').textContent = data.readingTime;
  document.getElementById('stat-images').textContent = fmt(data.imageCount);
  document.getElementById('stat-links').textContent = fmt(data.linkCount);
  document.getElementById('info-title').textContent = data.title || '(no title)';
  document.getElementById('info-desc').textContent = data.metaDescription || '(no meta description)';
  document.getElementById('info-url').innerHTML = `<a href="${data.url}" target="_blank">${data.url}</a>`;
}

function fmt(n) {
  return typeof n === 'number' ? n.toLocaleString() : '–';
}


function renderLinks() {
  if (!pageData) return;
  const list = document.getElementById('links-list');
  const counter = document.getElementById('links-count');

  list.innerHTML = '';
  const links = pageData.links || [];
  counter.textContent = `${links.length} found`;

  if (links.length === 0) {
    list.innerHTML = '<div style="color:#555580;font-size:12px;padding:10px">No links found.</div>';
    return;
  }

  links.forEach(href => {
    const el = document.createElement('div');
    el.className = 'link-item';
    el.textContent = href;
    el.title = href;
    el.addEventListener('click', () => {
      chrome.tabs.create({ url: href });
    });
    list.appendChild(el);
  });
}


function setupHighlightPanel() {
  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedColor = btn.dataset.color;

      chrome.tabs.sendMessage(currentTabId, {
        type: 'SET_HIGHLIGHT_COLOR',
        color: selectedColor
      });
    });
  });

  document.getElementById('highlight-toggle').addEventListener('click', () => {
    highlightEnabled = !highlightEnabled;
    const sw = document.getElementById('toggle-switch');
    sw.classList.toggle('on', highlightEnabled);

    chrome.tabs.sendMessage(currentTabId, {
      type: 'TOGGLE_HIGHLIGHT',
      enabled: highlightEnabled,
      color: selectedColor
    });
  });

  document.getElementById('clear-highlights').addEventListener('click', () => {
    chrome.tabs.sendMessage(currentTabId, { type: 'CLEAR_HIGHLIGHTS' });
  });
}


function setupStoragePanel() {
  document.getElementById('save-page-btn').addEventListener('click', saveCurrentPage);
  document.getElementById('clear-storage-btn').addEventListener('click', clearAllSaved);
}

async function saveCurrentPage() {
  if (!pageData) return;

  const key = `page_${Date.now()}`;
  const entry = {
    title: pageData.title,
    url: pageData.url,
    wordCount: pageData.wordCount,
    savedAt: new Date().toLocaleString()
  };

  await chrome.storage.local.set({ [key]: entry });
  await loadSavedPages();
}

async function loadSavedPages() {
  const allData = await chrome.storage.local.get(null);
  const list = document.getElementById('saved-pages');
  list.innerHTML = '';

  const entries = Object.entries(allData).filter(([k]) => k.startsWith('page_'));

  if (entries.length === 0) {
    list.innerHTML = '<div style="color:#555580;font-size:11px;padding:8px">No saved pages yet.</div>';
    return;
  }

  entries.sort(([a], [b]) => Number(b.split('_')[1]) - Number(a.split('_')[1]));

  entries.forEach(([key, data]) => {
    const el = document.createElement('div');
    el.className = 'saved-item';
    el.innerHTML = `
      <div>
        <div class="saved-title">${data.title || 'Untitled'}</div>
        <div style="color:#555580;font-size:10px;margin-top:2px">${data.savedAt}</div>
      </div>
      <div class="saved-count">${(data.wordCount || 0).toLocaleString()}w</div>
    `;
    list.appendChild(el);
  });
}

async function clearAllSaved() {
  const allData = await chrome.storage.local.get(null);
  const pageKeys = Object.keys(allData).filter(k => k.startsWith('page_'));
  await chrome.storage.local.remove(pageKeys);
  await loadSavedPages();
}
