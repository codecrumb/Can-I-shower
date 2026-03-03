const fs = require('fs');
const path = require('path');

let locationCoords = null;

function loadLocationCoords() {
    if (locationCoords) return locationCoords;
    try {
        const raw = fs.readFileSync(path.join(__dirname, '../../locations-latlong.json'), 'utf8');
        const obj = JSON.parse(raw);
        locationCoords = Object.entries(obj).map(([name, v]) => {
            const lat = Number(v && v.lat);
            const lng = Number(v && v.lng);
            return Number.isFinite(lat) && Number.isFinite(lng) ? { name, lat, lng } : null;
        }).filter(Boolean);
    } catch (e) {
        console.error('Failed to load locations-latlong.json:', e.message);
        locationCoords = [];
    }
    return locationCoords;
}

function findNearestLocation(lat, lng) {
    const locs = loadLocationCoords();
    if (!locs.length) return null;
    let best = null;
    let bestDist2 = Infinity;
    for (const loc of locs) {
        const dLat = lat - loc.lat;
        const dLng = lng - loc.lng;
        const dist2 = dLat * dLat + dLng * dLng;
        if (dist2 < bestDist2) {
            bestDist2 = dist2;
            best = loc;
        }
    }
    return best;
}

module.exports = { loadLocationCoords, findNearestLocation };
