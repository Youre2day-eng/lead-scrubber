// extension/popup.js
const $ = id => document.getElementById(id);

async function load() {
  const cfg = await chrome.storage.sync.get(['enabled', 'keywords', 'dashboardUrl', 'token']);
  $('enabled').checked = cfg.enabled !== false;
  $('keywords').value = cfg.keywords || '';
  $('dashboardUrl').value = cfg.dashboardUrl || 'https://lead-scrubber.pages.dev';
  $('token').value = cfg.token || '';
}

async function save() {
  await chrome.storage.sync.set({
    enabled: $('enabled').checked,
    keywords: $('keywords').value,
    dashboardUrl: $('dashboardUrl').value,
    token: $('token').value
  });
  $('status').textContent = 'Saved ✓';
  setTimeout(() => { $('status').textContent = ''; }, 1500);
}

document.addEventListener('DOMContentLoaded', load);
$('save').addEventListener('click', save);
