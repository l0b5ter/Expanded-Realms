'use strict';
const OWNER = 'l0b5ter';
const REPO = 'Expanded-Realms';
const ROOT = `https://github.com/${OWNER}/${REPO}`;
const RAW_MANIFEST = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/repository.json`;
const RELEASES = `${ROOT}/releases`;
const API_RELEASE = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;
const state = { entries: [], search: '', filter: 'all' };
const $ = id => document.getElementById(id);
const text = value => typeof value === 'string' || typeof value === 'number' ? String(value).trim() : '';
const first = (...values) => values.map(text).find(Boolean) || '';
const asArray = value => Array.isArray(value) ? value : value && typeof value === 'object' ? Object.entries(value).map(([key, item]) => typeof item === 'object' && item !== null ? { _key: key, ...item } : { _key: key, description: text(item) }) : [];
const getVersion = obj => first(obj.version, obj.latestVersion, obj.releaseVersion, obj.currentVersion);
const getDescription = obj => first(obj.description, obj.summary, obj.details, obj.longDescription, obj.info, obj.subtitle);
function normalize(obj, kind, key, index) {
  if (!obj || typeof obj !== 'object') return null;
  const name = first(obj.name, obj.displayName, obj.title, obj.label, obj._key, key);
  if (!name) return null;
  const version = getVersion(obj);
  const description = getDescription(obj);
  const requirements = obj.requirements ?? obj.requiredDlc ?? obj.requiredDLC ?? obj.dependencies ?? obj.requires;
  const notes = first(obj.notes, obj.changelog);
  return { id: `${kind}-${index}`, name, kind, version, description, requirements, notes };
}
function normalizeManifest(data) {
  if (!data || typeof data !== 'object') throw new Error('Repository manifest is not an object.');
  const result = [];
  // The repository schema can evolve. Recognize common collections without inventing catalog entries.
  const core = data.dlc ?? data.coreDlc ?? data.coreDLC ?? data.core ?? data.mainDlc ?? data.mainDLC;
  if (core && typeof core === 'object') {
    const items = Array.isArray(core) ? core : [core];
    items.forEach((obj, index) => {
      const entry = normalize(obj, 'core', 'Expanded Realms', index);
      if (entry) result.push(entry);
    });
  }
  const collections = [data.modules, data.optionalModules, data.addons, data.addOns, data.optionalContent];
  const seen = new Set();
  collections.forEach(collection => {
    if (!collection || seen.has(collection)) return;
    seen.add(collection);
    asArray(collection).forEach((obj, index) => {
      const entry = normalize(obj, 'module', '', result.length + index);
      if (entry && !result.some(existing => existing.kind === entry.kind && existing.name === entry.name)) result.push(entry);
    });
  });
  return result;
}
function make(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
}
function render() {
  const grid = $('module-grid');
  grid.replaceChildren();
  const filtered = state.entries.filter(item => (state.filter === 'all' || state.filter === item.kind) && `${item.name} ${item.description} ${item.version}`.toLowerCase().includes(state.search));
  $('catalog-count').textContent = `${filtered.length} ${filtered.length === 1 ? 'entry' : 'entries'} shown`;
  if (!filtered.length) {
    grid.append(make('div', 'empty', state.entries.length ? 'No modules match your search.' : 'No catalog entries to display. Check the manifest link for the latest repository information.'));
    return;
  }
  filtered.forEach(item => {
    const card = make('article', 'module-card');
    const meta = make('div', 'card-meta');
    meta.append(make('span', '', item.kind === 'core' ? 'Core DLC' : 'Optional module'));
    if (item.version) meta.append(make('span', 'version', `v${item.version.replace(/^v/i, '')}`));
    card.append(meta, make('h3', '', item.name), make('p', '', item.description || 'Explore this entry in the Expanded Realms repository.'));
    const bottom = make('div', 'card-bottom');
    const button = make('button', '', 'View details →');
    button.type = 'button';
    button.addEventListener('click', () => showDetails(item));
    bottom.append(button, make('span', 'tag', item.kind === 'core' ? 'Main package' : 'Optional'));
    card.append(bottom);
    grid.append(card);
  });
}
function displayRequirements(value) {
  if (!value) return '';
  if (Array.isArray(value)) return value.map(entry => typeof entry === 'object' ? first(entry.name, entry.id, entry.title) : text(entry)).filter(Boolean).join(', ');
  if (typeof value === 'object') return Object.entries(value).filter(([, enabled]) => enabled).map(([name]) => name).join(', ');
  return text(value);
}
function showDetails(item) {
  $('detail-kind').textContent = item.kind === 'core' ? 'CORE DLC' : 'OPTIONAL MODULE';
  $('detail-title').textContent = item.name;
  $('detail-version').textContent = item.version ? `Version ${item.version}` : 'Version not specified';
  $('detail-description').textContent = item.description || 'No description is provided in the repository manifest.';
  const extra = $('detail-extra');
  extra.replaceChildren();
  const requirements = displayRequirements(item.requirements);
  if (requirements) extra.append(make('p', '', `Requirements: ${requirements}`));
  if (item.notes) extra.append(make('p', '', `Notes: ${item.notes}`));
  $('detail-dialog').showModal();
}
async function loadManifest() {
  try {
    const response = await fetch(`${RAW_MANIFEST}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.entries = normalizeManifest(data);
    $('catalog-status').textContent = state.entries.length ? 'Catalog synchronized with the GitHub repository.' : 'Manifest loaded, but no supported catalog collections were found. The manifest structure may need a small mapping adjustment.';
  } catch (error) {
    $('catalog-status').textContent = 'Live catalog could not be loaded. Please check the repository manifest or try again later.';
    console.warn('Expanded Realms catalog:', error);
  }
  render();
}
async function loadRelease() {
  const buttons = [$('hero-download'), $('install-download')];
  try {
    const response = await fetch(API_RELEASE, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const release = await response.json();
    const assets = Array.isArray(release.assets) ? release.assets : [];
    const exe = assets.find(asset => /ExpandedRealmsModuleManager.*\.exe$/i.test(asset.name)) || assets.find(asset => /module.*manager.*\.exe$/i.test(asset.name));
    const destination = exe?.browser_download_url || release.html_url || RELEASES;
    buttons.forEach(button => { button.href = destination; });
    $('release-note').textContent = exe ? `Latest release: ${release.tag_name || release.name || 'available'} · Direct Windows EXE download.` : `Latest release: ${release.tag_name || release.name || 'available'} · Choose the Windows manager on GitHub.`;
  } catch {
    buttons.forEach(button => { button.href = RELEASES; });
    $('release-note').textContent = 'Download via GitHub Releases. The latest release could not be checked automatically.';
  }
}
$('search').addEventListener('input', event => { state.search = event.target.value.trim().toLowerCase(); render(); });
$('filter').addEventListener('change', event => { state.filter = event.target.value; render(); });
$('detail-close').addEventListener('click', () => $('detail-dialog').close());
$('detail-action').addEventListener('click', () => $('detail-dialog').close());
$('detail-dialog').addEventListener('click', event => { if (event.target === $('detail-dialog')) $('detail-dialog').close(); });
loadManifest();
loadRelease();
