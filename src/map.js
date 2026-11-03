import * as Leaflet from 'https://unpkg.com/leaflet@1.9.4/dist/leaflet-src.esm.js';
import { escapeSheetText } from './main.js';

const CAMPUS_CENTER = [42.4477, -76.4823]; // for when map first loads

let map;
let pins;
let userDot;
const pinByLocation = new Map(); // location -> pin

export function initMap(el) {
  map = Leaflet.map(el).setView(CAMPUS_CENTER, 15);
  Leaflet.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: 'ENGRC 3500 Team 4',
  }).addTo(map);
  pins = Leaflet.layerGroup().addTo(map);

  // Add user location
  map.on('locationfound', (e) => {
    if (userDot) {
      userDot.setLatLng(e.latlng);
    } else {
      userDot = Leaflet.circleMarker(e.latlng, {
        radius: 8,
        color: '#fff',
        weight: 3,
        fillColor: '#1a73e8',
        fillOpacity: 1,
        interactive: false,
      }).addTo(map);
    }
    map.setView(e.latlng, Math.max(map.getZoom(), 17));
  });

  map.on('locationerror', () => {
    alert('Location fetch failed');
  });
}

export function locateUser() {
  map.locate({ enableHighAccuracy: true });
}

// Resize map when container changes (e.g. open location list on movile)
export function resizeMap() {
  map.invalidateSize();
}

export function showPins(locations) {
  pins.clearLayers();
  pinByLocation.clear();

  const byPoint = new Map();
  for (const place of locations) {
    if (place.lat == null || place.lng == null) {
      continue;
    }
    const key = place.lat + ',' + place.lng;
    if (!byPoint.has(key)) {
      byPoint.set(key, []);
    }
    byPoint.get(key).push(place);
  }

  for (const group of byPoint.values()) {
    const pin = Leaflet.marker([group[0].lat, group[0].lng], { icon: createPinIcon(group) });

    pin.bindPopup(() => buildPopupHtml(group), {
      maxWidth: Math.min(300, map.getSize().x - 110),
      maxHeight: 220,
      // move popup away from map zoom buttons
      autoPanPaddingTopLeft: [56, 12],
      autoPanPaddingBottomRight: [12, 12],
    });
    pin.addTo(pins);

    for (const place of group) {
      pinByLocation.set(place, pin);
    }
  }
}

// open pin's popup
export function openLocation(place) {
  const pin = pinByLocation.get(place);
  if (pin) {
    pin.openPopup();
  }
}

function createPinIcon(group) {
  const emojis = [];
  for (const place of group) {
    if (!emojis.includes(place.category.emoji)) {
      emojis.push(place.category.emoji);
    }
  }

  let dots = '';
  for (const emoji of emojis) {
    dots += `<span class="pin-dot">${escapeSheetText(emoji)}</span>`;
  }

  const width = 30 * emojis.length;
  return Leaflet.divIcon({
    className: 'pin',
    html: dots,
    iconSize: [width, 30],
    iconAnchor: [width / 2, 15],
    popupAnchor: [0, -15],
  });
}

function buildPopupHtml(group) {
  const lat = group[0].lat;
  const lng = group[0].lng;
  const mapsUrl = 'https://www.google.com/maps/search/?api=1&query=' + lat + ',' + lng;

  let items = '';
  for (const place of group) {
    const category = place.category;
    items += `
      <li>
        <p>${escapeSheetText(category.emoji)}${escapeSheetText(category.title)}</p>
        <h2>${escapeSheetText(place.name)}</h2>
        <p class="row-subtitle">${escapeSheetText(place.address)}</p>
        ${buildSectionHtml('About this location', place.notes, place.links)}
        ${buildSectionHtml('About ' + category.title, category.about, category.links)}
      </li>`;
  }

  return `
    <div class="popup">
      <ul class="popup-spots">${items}</ul>
      <p><a href="${mapsUrl}" target="_blank" rel="noopener">Open in Google Maps</a></p>
    </div>`;
}

function buildSectionHtml(heading, paragraphs, links) {
  if (paragraphs.length === 0 && links.length === 0) {
    return '';
  }
  let html = `<h3>${escapeSheetText(heading)}</h3>`;
  for (const p of paragraphs) {
    html += `<p>${escapeSheetText(p)}</p>`;
  }
  html += buildLinksHtml(links);
  return html;
}

function buildLinksHtml(links) {
  if (links.length === 0) {
    return '';
  }
  let html = '<ul>';
  for (const link of links) {
    html += `<li><a href="${escapeSheetText(link.url)}" target="_blank" rel="noopener">${escapeSheetText(link.text)}</a></li>`;
  }
  html += '</ul>';
  return html;
}
