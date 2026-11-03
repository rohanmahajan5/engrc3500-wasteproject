import Papa from 'https://cdn.jsdelivr.net/npm/papaparse@5.4.1/+esm';

// two tabs in the google sheet
// locations:  category, name, address, notes, links, lat, lng
// categories: title, emoji, about, links
const SHEET_ID = '1HvMjA0aVCzMNoTQzIsyK_PysjyejbjlE';

function tabUrl(name) {
  return `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:csv&headers=1&sheet=${encodeURIComponent(name)}`;
}

export async function loadSheet() {
  // fetch both tabs at the same time
  const [locationRows, categoryRows] = await Promise.all([readTab('Locations'), readTab('Categories')]);

  // categories
  const categories = [];
  for (const c of categoryRows) {
    categories.push({
      title: c.title,
      emoji: c.emoji || '',
      about: lines(c.about),
      links: links(c.links),
    });
  }

  // locations
  const locations = [];
  for (const l of locationRows) {
    let category = categories.find((c) => c.title === l.category);
    if (!category) {
      category = { title: l.category, emoji: '', about: [], links: [] };
    }
    locations.push({
      category: category,
      name: l.name,
      address: l.address,
      notes: lines(l.notes),
      links: links(l.links),
      lat: number(l.lat),
      lng: number(l.lng),
    });
  }

  return { categories, locations };
}

async function readTab(name) {
  const res = await fetch(tabUrl(name));
  if (!res.ok) {
    throw new Error(`Error- Tab: ${name} Status:(${res.status})`);
  }
  const text = await res.text();
  const table = Papa.parse(text, { header: true, skipEmptyLines: 'greedy' });
  return table.data;
}

function lines(cell) {
  if (!cell) {
    return [];
  }
  return cell
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line !== '');
}

// link format: <preview_text> | <url>
function links(cell) {
  const result = [];
  for (const line of lines(cell)) {
    const at = line.lastIndexOf(' | ');
    if (at === -1) {
      result.push({ text: line, url: line });
    } else {
      result.push({ text: line.slice(0, at), url: line.slice(at + 3) });
    }
  }
  return result;
}

function number(cell) {
  if (!cell || cell.trim() === '') {
    return null;
  }
  return Number(cell);
}
