// Small geometry helpers. GeoJSON coordinates are [lng, lat].

function pointInRing(lng, lat, ring) {
    let inside = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
        const [xi, yi] = ring[i];
        const [xj, yj] = ring[j];
        if ((yi > lat) !== (yj > lat) && lng < (xj - xi) * (lat - yi) / (yj - yi) + xi) {
            inside = !inside;
        }
    }
    return inside;
}

function polygonsOf(feature) {
    const g = feature.geometry;
    return g.type === 'Polygon' ? [g.coordinates] : g.coordinates;
}

function pointInFeature(latlng, polygons) {
    return polygons.some(([outer, ...holes]) =>
        pointInRing(latlng.lng, latlng.lat, outer) &&
        !holes.some(h => pointInRing(latlng.lng, latlng.lat, h)));
}

// Returns find(latlng) -> the feature containing the point, or null.
// Bounding boxes skip most features before the slower ring test.
function indexFeatures(geojson) {
    const items = geojson.features.map(feature => {
        const polygons = polygonsOf(feature);
        const outer = polygons.flatMap(p => p[0]);
        const xs = outer.map(c => c[0]);
        const ys = outer.map(c => c[1]);
        return { feature, polygons, box: [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)] };
    });

    return latlng => {
        const hit = items.find(({ box, polygons }) =>
            latlng.lng >= box[0] && latlng.lng <= box[2] &&
            latlng.lat >= box[1] && latlng.lat <= box[3] &&
            pointInFeature(latlng, polygons));
        return hit ? hit.feature : null;
    };
}

function distanceKm(a, b) {
    const rad = d => d * Math.PI / 180;
    const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
        Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
    return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// EstuaryNo in the catchment data is the mouth's latitude as a positive number.
// The mouth is taken as the most easterly (seaward) point of the catchment at that latitude.
// Checked against the 14 monitored estuaries: all within about 2 km.
function estuaryMouth(feature) {
    const lat0 = -Math.abs(feature.properties.EstuaryNo);
    if (!Number.isFinite(lat0)) return null;

    const pts = polygonsOf(feature).flatMap(p => p[0]);
    let near = pts.filter(([, lat]) => Math.abs(lat - lat0) < 0.02);
    if (!near.length) {
        near = [...pts].sort((a, b) => Math.abs(a[1] - lat0) - Math.abs(b[1] - lat0)).slice(0, 20);
    }
    const [lng, lat] = near.reduce((best, p) => (p[0] > best[0] ? p : best));
    return L.latLng(lat, lng);
}

// "LITTLE LAKE (WALLAGA)" -> "Little Lake (Wallaga)"
function titleCase(s) {
    return String(s || '').toLowerCase().replace(/(^|[\s(])([a-z])/g, (m, a, b) => a + b.toUpperCase());
}

function escapeHtml(s) {
    return String(s ?? '').replace(/[&<>"']/g, c =>
        ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
