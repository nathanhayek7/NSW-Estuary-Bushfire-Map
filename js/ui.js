// Cards on the map (title, layers) and the About dialog.

function addCard(map, className, html) {
    let el;
    const Card = L.Control.extend({
        options: { position: 'topleft' },
        onAdd() {
            el = L.DomUtil.create('div', `card ${className}`);
            el.innerHTML = html;
            L.DomEvent.disableClickPropagation(el);
            L.DomEvent.disableScrollPropagation(el);
            return el;
        }
    });
    map.addControl(new Card());
    return el;
}

// The chevron button on a card: points up when the card is open, down when closed
function setChevron(button, open) {
    button.classList.toggle('is-open', open);
    button.setAttribute('aria-expanded', open);
}

function readSetting(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}

function saveSetting(key, value) {
    try { localStorage.setItem(key, value); } catch { /* private browsing; not important */ }
}

function titleCard(map, model, on) {
    const el = addCard(map, 'title-card', `
        <div class="title-row">
            <div>
                <h1>Bushfires &amp; estuary water quality</h1>
                <p class="subtitle collapsible">Coastal NSW, using a model built on the 2019–20 fires</p>
            </div>
            <div class="title-btns">
                <button type="button" class="icon-btn" data-action="about" title="About this map" aria-label="About this map">?</button>
                <button type="button" class="icon-btn" data-action="toggle" title="Show or hide" aria-label="Show or hide"><span class="chev"></span></button>
            </div>
        </div>
        <label class="jump collapsible">
            <span class="sr-only">Monitored estuary</span>
            <select>
                <option value="" disabled hidden selected>Go to a monitored estuary…</option>
                ${model.siteList.map(s => `<option value="${escapeHtml(s.name)}">${escapeHtml(s.name)}</option>`).join('')}
            </select>
        </label>`);

    const select = el.querySelector('select');
    const toggle = el.querySelector('[data-action="toggle"]');

    // Starts collapsed on phones; the choice is remembered on each device
    const setCollapsed = collapsed => {
        el.classList.toggle('collapsed', collapsed);
        setChevron(toggle, !collapsed);
        saveSetting('title-collapsed', collapsed ? '1' : '0');
    };
    const saved = readSetting('title-collapsed');
    setCollapsed(saved === null ? window.innerWidth <= 700 : saved === '1');

    toggle.onclick = () => setCollapsed(!el.classList.contains('collapsed'));
    el.querySelector('[data-action="about"]').onclick = on.about;
    select.onchange = () => on.jump(model.sites[select.value]);

    return {
        showSelected(name) {
            select.value = name && model.sites[name] ? name : '';
        }
    };
}

function layerCard(map, layers) {
    const el = addCard(map, 'key', `
        <button type="button" class="key-toggle">
            <span>Map layers</span><span class="icon-btn icon-sm"><span class="chev"></span></span>
        </button>
        <div class="key-body">
            <label class="key-row">
                <input type="checkbox" data-layer="outlook" checked>
                <span class="sw sw-outlook"></span>
                <span>Above normal bushfire potential this spring
                    <span class="small muted">AFAC Seasonal Bushfire Outlook, Spring 2026 ${cite('afac')}</span></span>
            </label>
            <label class="key-group">
                <input type="checkbox" data-layer="catchments" checked>
                <span class="bracket" aria-hidden="true"></span>
                <span class="key-group-rows">
                    <span class="key-item">
                        <span class="sw sw-catch"></span>
                        <span>Monitored estuary catchment
                            <span class="small muted">Land draining to one of the 14 monitored estuaries ${cite('catchments')}</span></span>
                    </span>
                    <span class="key-item">
                        <span class="sw sw-catch-other"></span>
                        <span>Other estuary catchment
                            <span class="small muted">Not monitored; uses the nearest monitored estuary ${cite('catchments')}</span></span>
                    </span>
                </span>
            </label>
            <div class="key-row">
                <span></span>
                <span class="sw sw-dot"></span>
                <span>Monitored estuary</span>
            </div>
            <div class="key-row">
                <span></span>
                <span class="sw sw-dot sw-dot-red"></span>
                <span>Monitored estuary where bushfire potential is above normal this spring</span>
            </div>
        </div>`);

    const toggle = el.querySelector('.key-toggle');
    const body = el.querySelector('.key-body');
    const setOpen = open => {
        body.hidden = !open;
        setChevron(toggle.querySelector('.icon-btn'), open);
    };
    setOpen(window.innerWidth > 700);
    toggle.onclick = () => setOpen(body.hidden);

    el.querySelectorAll('input[data-layer]').forEach(box => {
        box.onchange = () => {
            const layer = layers[box.dataset.layer];
            box.checked ? layer.addTo(map) : map.removeLayer(layer);
        };
    });
}

function aboutDialog(modal) {
    const card = modal.querySelector('.modal-card');
    const { ICOLL: icoll, River: river } = CONFIG.estuaryTypes;

    card.innerHTML = `
        <button class="close" type="button" aria-label="Close">×</button>
        <h2 id="about-title">About this map</h2>
        <p>Tap anywhere on land along the NSW coast to see what a bushfire there would do to water quality
           in the <strong>estuary that land drains into</strong>, using NSW estuary drainage catchments ${cite('catchments')}.</p>

        <h3>What the two layers show</h3>
        <ul>
            <li><strong>Red areas: above normal bushfire potential.</strong> AFAC's Spring 2026 outlook marks where
                seasonal conditions, mainly below-average rainfall and dryness, point to an increased risk of fire ${cite('afac')}.
                It describes conditions for the season, not where or whether a fire will happen, and fires can still
                occur in areas of normal bushfire potential.</li>
            <li><strong>Predictions: what a fire would do.</strong> The panel shows the water quality expected
                <em>if</em> a bushfire burns the catchment.</li>
        </ul>
        <p class="muted">The outlook doesn't change the predictions. It shows where this season's conditions make that scenario more relevant.</p>

        <h3>How the predictions work</h3>
        <ul>
            <li>Water quality was monitored before, during and after the 2019–20 bushfires in 14 NSW estuaries ${cite('dataset')},
                shown as dots on the map ${cite('estuaries')}.</li>
            <li>For each water quality measure and time window, the typical change from before the fire was worked out across all 14 estuaries.</li>
            <li><strong>Every estuary gets the same typical change.</strong> Only its own normal (pre-fire) level differs,
                so a prediction is that estuary's normal level with the typical change applied.</li>
            <li><strong>Time windows:</strong> "During" is while the fire was burning. The others are counted from the day
                the fire was extinguished: 0–3 months, 3–12 months, 1–2 years and 2+ years. Normal levels are averages
                from before the fire started.</li>
            <li>The predictions describe fires on the scale of 2019–20 (Black Summer) and the heavy rain that followed. Most of a fire's effect on water quality arrives when rain washes ash and soil into the estuary.</li>
            <li><strong>Salinity is a flood indicator, not a fire response.</strong> A fall in salinity indicates freshwater inflow after rain, which a fire cannot cause directly.</li>
            <li><strong>Consistent changes</strong> are listed first: most estuaries changed the same way (p &lt; 0.05).</li>
            <li>If the land drains to an estuary that wasn't monitored, the monitored estuary nearest that estuary's mouth is used, with a warning.
                Land draining straight to the ocean, or inland west of the Great Dividing Range, isn't covered.</li>
        </ul>

        <h3>Limitations</h3>
        <ul>
            <li>Built from one fire season and 14 estuaries. Some measures and windows have data from fewer estuaries.</li>
            <li>Burnt area and fire severity aren't included, so every fire is treated like 2019–20.</li>
            <li>The changes include the effect of the heavy rain in February and March 2020 on burnt catchments. A fire followed by a dry period may change water quality less.</li>
            <li>The predictions did better than assuming "no change" mainly in the first 3 months. After that, most estuaries were back within their normal variation.</li>
            <li>Predictions for estuaries that weren't monitored are indicative only.</li>
        </ul>

        <h3>Estuary types</h3>
        <ul>
            <li><strong>${icoll.label} (${icoll.name.toLowerCase()}):</strong> ${escapeHtml(icoll.text)} ${cite(icoll.ref)}</li>
            <li><strong>${river.name}:</strong> ${escapeHtml(river.text)} ${cite(river.ref)}</li>
        </ul>

        <h3>References</h3>
        <ol class="refs">
            ${CONFIG.references.map(r => `
                <li><span>${cite(r.id)}</span><span>${escapeHtml(r.text)}
                    <a href="${escapeHtml(r.url)}" target="_blank" rel="noopener">${escapeHtml(r.url)}</a>
                    (accessed ${escapeHtml(r.accessed)}).</span></li>`).join('')}
        </ol>
        <p class="small muted">The outlook areas were traced from AFAC's published NSW map ${cite('afac')}. The catchments were
           simplified to about 100m ${cite('catchments')}. Taps outside NSW are found with a simplified state boundary file ${cite('boundary')}.
           Water quality values come from the Map Export sheet of the Thesis B spreadsheet model, built on ${cite('dataset')}.
           Basemap ${cite('osm')}; map built with Leaflet ${cite('leaflet')}. Thesis B, Macquarie University.</p>`;

    const close = () => { modal.hidden = true; };
    card.querySelector('.close').onclick = close;
    modal.addEventListener('click', e => { if (e.target === modal) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

    return {
        open() {
            modal.hidden = false;
            card.querySelector('.close').focus();
        }
    };
}

function popupMessage(map, latlng, html) {
    L.popup({ className: 'msg-popup', maxWidth: 260 }).setLatLng(latlng).setContent(html).openOn(map);
}
