import { loadSheet } from './sheet.js';
import { initMap, showPins, openLocation, locateUser, resizeMap } from './map.js';

const filters = document.getElementById('filters');
const search = document.getElementById('search-input');
const locateButton = document.getElementById('locate');
const list = document.getElementById('list');
const sidebar = document.getElementById('sidebar');
const toggle = document.getElementById('sheet-toggle');

const selected = new Set();

initMap(document.getElementById('map'));
const { categories, locations } = await loadSheet();
locations.sort((a, b) => a.name.localeCompare(b.name)); // optional sort by alphabetical order, can remove later to keep google sheet
render();

function render() {
  const visible = visibleLocations();
  showPins(visible);
  renderCategoryFilters();
  renderLocationList(visible);

  // Update "[X] Locations" text
  if (visible.length === 1) {
    toggle.textContent = '1 location';
  } else {
    toggle.textContent = visible.length + ' locations';
  }
}

function visibleLocations() {
  const query = search.value.toLowerCase().trim();
  const res = [];
  // build locations text, then filter
  for (const place of locations) {
    if (selected.size > 0 && !selected.has(place.category.title)) {
      continue;
    }
    // add name and address
    let text = place.name + '\n' + place.address;
    for (const note of place.notes) {
      text += '\n' + note;
    }
    // add category title
    text += '\n' + place.category.title;
    text = text.toLowerCase();


    if (query !== '' && !text.includes(query)) {
      continue;
    }
    res.push(place);
  }

  return res;
}

function renderCategoryFilters() {
  // generate HTML body for filter buttons, customize later
  filters.innerHTML = '';

  // All button
  const allButton = document.createElement('button');
  allButton.className = 'filter';
  allButton.textContent = 'All';
  if (selected.size === 0) {
    allButton.classList.add('selected');
  }
  allButton.onclick = () => {
    selected.clear();
    render();
  };
  filters.append(allButton);

  // One button per category from category sheet
  for (const category of categories) {
    const button = document.createElement('button');
    button.className = 'filter';
    // emoji
    button.textContent = category.emoji + category.title;
    if (selected.has(category.title)) {
      button.classList.add('selected');
    }
    // click to toggle on/off
    button.onclick = () => {
      if (selected.has(category.title)) {
        selected.delete(category.title);
      } else {
        selected.add(category.title);
      }
      // re-render after toggle
      render();
    };
    filters.append(button);
  }
}

// List of locations, grouped by exact match on name if found
function renderLocationList(visible) {
  list.innerHTML = '';

  const groups = new Map();
  for (const place of visible) {
    if (!groups.has(place.name)) {
      groups.set(place.name, []);
    }
    groups.get(place.name).push(place);
  }

  for (const [name, group] of groups) {
    if (group.length === 1) {
      list.append(createLocationButton(name, group[0]));
      continue;
    }
    // details tag for expanding a group of multiple locations
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    summary.innerHTML = `${escapeSheetText(name)}<span class="row-subtitle">${group.length} locations</span>`;
    details.append(summary);
    for (const place of group) {
      details.append(createLocationButton(place.category.title, place));
    }
    list.append(details);
  }
}
// render location button to request location
function createLocationButton(title, place) {
  const button = document.createElement('button');
  button.className = 'row';
  button.innerHTML = `${escapeSheetText(title)}<span class="row-subtitle">${escapeSheetText(place.address)}</span>`;
  button.onclick = () => openLocation(place);
  return button;
}
locateButton.onclick = () => {
  locateUser();
};

// misc event listeners
search.oninput = () => {
  render();
};

search.onkeydown = (e) => {
  if (e.key === 'Escape') {
    search.value = '';
    render();
  }
};

toggle.onclick = () => {
  sidebar.classList.toggle('open');
  resizeMap();
};

// make sheet text safe to put inside HTML
export function escapeSheetText(text) {
  if (text == null) {
    return '';
  }
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}
