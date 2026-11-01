// Sets up the map and handles taps, estuary selection and share links.

const map = L.map('map', {
    zoomControl: false,
    minZoom: CONFIG.minZoom,
    maxBounds: CONFIG.maxBounds,
    maxBoundsViscosity: 0.8,
    renderer: L.svg({ padding: 1 })   // draw a screen beyond the view so shapes don't vanish while dragging
});
map.fitBounds(CONFIG.startBounds);

for (const [pane, z] of [['outlook', 405], ['catchments', 410], ['selection', 420], ['sites', 450]]) {
    map.createPane(pane).style.zIndex = z;
}
addBasemap(map);

const MESSAGES = {
    outside: '<strong>Outside NSW land.</strong><br>Tap on land in NSW. The model is built from NSW estuaries.',
    inland: '<strong>Not in an estuary catchment.</strong><br>This land doesn\'t drain to a coastal estuary (west of the Great Dividing Range it drains inland), so the model doesn\'t apply.',
    sea: '<strong>Drains straight to the ocean.</strong><br>This strip of land doesn\'t drain into an estuary. Try the outlined catchment next to it.',
    loadFailed: 'Could not load the map data. Open this page through GitHub Pages or a local web server, not by double-clicking index.html.'
};

async function main() {
    let data;
    try {
        data = await loadAll();
    } catch (err) {
        console.error(err);
        popupMessage(map, map.getCenter(), MESSAGES.loadFailed);
        return;
    }

    const { model, estuaries } = data;
    const layers = {
        outlook: outlookLayer(data.outlook).addTo(map),
        catchments: catchmentLayer(data.catchments).addTo(map)
    };
    const selection = selectionLayer(map);
    const about = aboutDialog(document.getElementById('about'));
    const panelEl = document.getElementById('panel');
    let shown = null;   // what's in the panel, for the share link

    const panel = createPanel(panelEl, model, {
        close: clearSelection,
        about: () => about.open(),
        windowChange: updateLink,
        async copy(button) {
            try {
                await navigator.clipboard.writeText(location.href);
                button.textContent = 'Link copied';
            } catch {
                button.textContent = 'Copy the address bar to share';
            }
            setTimeout(() => { button.textContent = 'Copy link to this view'; }, 2000);
        }
    });

    const title = titleCard(map, model, {
        about: () => about.open(),
        jump(site) {
            map.setView([site.lat, site.lng], Math.max(map.getZoom(), 9));
            showSite(site);
        }
    });

    layerCard(map, layers);
    L.control.zoom({ position: 'bottomleft' }).addTo(map);
    // Leaflet's scale bar puts a space before the unit ("200 km"); this writes "200km"
    const Scale = L.Control.Scale.extend({
        _updateMetric(maxMeters) {
            const meters = this._getRoundNum(maxMeters);
            const label = meters < 1000 ? `${meters}m` : `${meters / 1000}km`;
            this._updateScale(this._mScale, label, meters / maxMeters);
        }
    });
    new Scale({ position: 'bottomleft', imperial: false }).addTo(map);
    estuaryMarkers(model, data.inOutlook, showSite).addTo(map);

    function show(estuary, latlng, fromMarker) {
        document.getElementById('hint').hidden = true;
        map.closePopup();
        selection.show(estuary, latlng, fromMarker);
        panel.show({ estuary, latlng, fromMarker, outlookAbove: data.inOutlook(latlng) });
        title.showSelected(estuary.monitored ? estuary.site.name : null);

        shown = { latlng, site: fromMarker ? estuary.site.name : null };
        updateLink();
        keepInView(latlng);
    }

    function showSite(site) {
        show(estuaries.forSite(site), L.latLng(site.lat, site.lng), true);
    }

    function handleTap(latlng) {
        if (!data.inNsw(latlng)) return message(latlng, MESSAGES.outside);
        const result = estuaries.at(latlng);
        if (result.kind !== 'estuary') return message(latlng, MESSAGES[result.kind]);
        show(result, latlng, false);
    }

    function message(latlng, html) {
        clearSelection();
        popupMessage(map, latlng, html);
    }

    function clearSelection() {
        selection.clear();
        panel.hide();
        title.showSelected(null);
        shown = null;
        history.replaceState(null, '', location.pathname + location.search);
    }

    // Leave room for the panel (right side on wide screens, bottom sheet on phones)
    function keepInView(latlng) {
        requestAnimationFrame(() => {
            const box = panelEl.getBoundingClientRect();
            const wide = window.innerWidth > 700;
            map.panInside(latlng, {
                paddingTopLeft: wide ? [330, 40] : [30, 90],
                paddingBottomRight: wide ? [box.width + 40, 40] : [30, box.height + 30]
            });
        });
    }

    // Share links look like #site=Wallaga%20Lake&w=1-2%20years or #-35.7200,150.0000&w=0-3%20months
    function updateLink() {
        if (!shown) return;
        const where = shown.site
            ? `site=${encodeURIComponent(shown.site)}`
            : `${shown.latlng.lat.toFixed(4)},${shown.latlng.lng.toFixed(4)}`;
        history.replaceState(null, '', `#${where}&w=${encodeURIComponent(panel.window)}`);
    }

    function openLink() {
        const hash = decodeURIComponent(location.hash.slice(1));
        if (!hash) return;
        const [where, win] = hash.split('&w=');
        if (win) panel.window = win;

        if (where.startsWith('site=')) {
            const site = model.sites[where.slice(5)];
            if (site) {
                map.setView([site.lat, site.lng], 10);
                showSite(site);
            }
            return;
        }
        const [lat, lng] = where.split(',').map(Number);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
            map.setView([lat, lng], 9);
            handleTap(L.latLng(lat, lng));
        }
    }

    map.on('click', e => handleTap(e.latlng));
    openLink();
}

main();
