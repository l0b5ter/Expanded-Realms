'use strict';
const OWNER = 'l0b5ter';
const REPO = 'Expanded-Realms';
const ROOT = `https://github.com/${OWNER}/${REPO}`;
const RAW_MANIFEST = `https://raw.githubusercontent.com/${OWNER}/${REPO}/main/repository.json`;
const RELEASES = `${ROOT}/releases`;
const state = { entries: [], officialDlc: {}, search: '', filter: 'all' };
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
  const subtitle = first(obj.subtitle);
  const requirements = obj.dependencies ?? obj.requirements ?? obj.requiredDlc ?? obj.requiredDLC ?? obj.requires;
  const notes = first(obj.notes, obj.changelog);
  return { id: `${kind}-${index}`, sourceId: first(obj.id, obj._key), name, kind, version, subtitle, description, requirements, notes };
}
function normalizeManifest(data) {
  if (!data || typeof data !== 'object') throw new Error('Repository manifest is not an object.');
  const result = [];
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
  const filtered = state.entries.filter(item => (state.filter === 'all' || state.filter === item.kind) && `${item.name} ${item.subtitle} ${item.description} ${item.version}`.toLowerCase().includes(state.search));
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
    card.append(meta, make('h3', '', item.name), make('p', '', item.subtitle || 'No subtitle provided.'));
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
  if (typeof value === 'object') {
    const official = Array.isArray(value.officialDlc) ? value.officialDlc : [];
    const modules = Array.isArray(value.modules) ? value.modules : [];
    const resolved = [
      ...official.map(id => state.officialDlc[id]?.name || text(id)),
      ...modules.map(id => state.entries.find(item => item.sourceId === id)?.name || text(id))
    ].filter(Boolean);
    if (resolved.length || 'officialDlc' in value || 'modules' in value) return resolved.join(', ');
    return Object.entries(value).filter(([, enabled]) => enabled === true).map(([name]) => name).join(', ');
  }
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
function configureInstaller(installer) {
  const url = text(installer?.downloadUrl);
  const valid = /^https:\/\/github\.com\/l0b5ter\/Expanded-Realms\/releases\/download\/[^\s]+\.exe(?:\?[^\s]*)?$/i.test(url);
  const buttons = [$('hero-download'), $('install-download')].filter(Boolean);
  if (valid) {
    buttons.forEach(button => { button.href = url; });
    $('release-note').textContent = `${first(installer.name, 'Expanded Realms Module Manager')}${installer.version ? ` v${installer.version}` : ''} · Direct Windows EXE download.`;
  } else {
    buttons.forEach(button => { button.href = RELEASES; });
    $('release-note').textContent = 'Installer download URL is unavailable in the repository manifest. View GitHub Releases.';
  }
}
async function loadManifest() {
  try {
    const response = await fetch(`${RAW_MANIFEST}?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const data = await response.json();
    state.officialDlc = data.officialDlc || {};
    state.entries = normalizeManifest(data);
    configureInstaller(data.installer);
    $('catalog-status').textContent = state.entries.length ? 'Catalog synchronized with the GitHub repository.' : 'Manifest loaded, but no supported catalog collections were found. The manifest structure may need a small mapping adjustment.';
  } catch (error) {
    $('catalog-status').textContent = 'Live catalog could not be loaded. Please check the repository manifest or try again later.';
    $('release-note').textContent = 'Could not load the installer link from the repository manifest. View GitHub Releases.';
    console.warn('Expanded Realms catalog:', error);
  }
  render();
}
$('search').addEventListener('input', event => { state.search = event.target.value.trim().toLowerCase(); render(); });
$('filter').addEventListener('change', event => { state.filter = event.target.value; render(); });
$('detail-close').addEventListener('click', () => $('detail-dialog').close());
$('detail-action').addEventListener('click', () => $('detail-dialog').close());
$('detail-dialog').addEventListener('click', event => { if (event.target === $('detail-dialog')) $('detail-dialog').close(); });
loadManifest();
