// Map layers, from the bottom up: basemap, outlook, catchments, selection, estuary markers.

function addBasemap(map) {
    // keepBuffer holds extra rows of tiles around the view, so panning back doesn't refetch them
    return L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
        keepBuffer: 8,
        updateWhenIdle: false
    }).addTo(map);
}

function outlookLayer(outlook) {
    return L.geoJSON(outlook, {
        pane: 'outlook',
        interactive: false,
        style: { color: CONFIG.red, weight: 1.5, opacity: 0.9, fillColor: CONFIG.red, fillOpacity: 0.28 }
    });
}

// Monitored catchments are shaded with a solid edge; the rest are plain outlines,
// visible but clearly secondary. Land draining straight to the sea isn't drawn.
function catchmentLayer(catchments) {
    const monitored = f => !!f.properties.model_site;
    const draw = (filter, style) =>
        L.geoJSON(catchments, { pane: 'catchments', interactive: false, filter, style });

    return L.layerGroup([
        draw(f => f.properties.TYPE !== 'NIL ESTUARY' && !monitored(f),
            { color: '#3E5675', weight: 1.2, opacity: 0.75, fill: false }),
        draw(monitored, { color: '#fff', weight: 4, opacity: 0.7, fill: false }),
        draw(monitored, { color: CONFIG.navy, weight: 2, opacity: 1, fillColor: CONFIG.navy, fillOpacity: 0.14 })
    ]);
}

function estuaryMarkers(model, inOutlook, onClick) {
    const group = L.layerGroup();

    for (const site of model.siteList) {
        const above = inOutlook(L.latLng(site.lat, site.lng));
        const type = CONFIG.estuaryTypes[site.type]?.name ?? site.type;

        L.circleMarker([site.lat, site.lng], {
            pane: 'sites',
            radius: 8,
            weight: 2.5,
            color: '#fff',
            fillColor: above ? CONFIG.red : CONFIG.navy,
            fillOpacity: 1
        })
            .bindTooltip(
                `<strong>${escapeHtml(site.name)}</strong><br>${escapeHtml(type)}, ${escapeHtml(site.fire)}` +
                (above ? '<br><span class="tip-red">Above normal bushfire potential this spring</span>' : ''),
                { direction: 'top', offset: [0, -8] })
            .on('click', e => { L.DomEvent.stopPropagation(e); onClick(site); })
            .addTo(group);
    }

    return group;
}

function selectionLayer(map) {
    const group = L.layerGroup().addTo(map);
    const opts = { pane: 'selection', interactive: false };

    return {
        clear: () => group.clearLayers(),
        show(estuary, latlng, fromMarker) {
            group.clearLayers();
            if (estuary.feature) {
                L.geoJSON(estuary.feature, {
                    ...opts,
                    style: { color: CONFIG.navy, weight: 3, fillColor: CONFIG.navy, fillOpacity: 0.22 }
                }).addTo(group);
            }
            if (!fromMarker) {
                const site = estuary.site;
                L.polyline([latlng, [site.lat, site.lng]], { ...opts, color: CONFIG.navy, weight: 2, dashArray: '6 6' }).addTo(group);
                L.circleMarker(latlng, { ...opts, radius: 6, color: CONFIG.navy, weight: 2.5, fillColor: '#fff', fillOpacity: 1 }).addTo(group);
            }
        }
    };
}
