// The prediction panel: a side panel on wide screens, a bottom sheet on phones.

function fmt(v) {
    if (v === null || v === undefined) return '–';
    if (v === 0) return '0';
    const a = Math.abs(v);
    if (a >= 1000) return Math.round(v).toLocaleString('en-AU');
    if (a >= 100) return String(Math.round(v));
    if (a >= 10) return v.toFixed(1);
    if (a >= 1) return v.toFixed(2);
    return v.toPrecision(2);
}

function fmtChange(row) {
    if (row.change === null) return '–';
    if (row.changeType === 'Ratio') return `${fmt(row.change)}×`;
    return (row.change < 0 ? '−' : '+') + fmt(Math.abs(row.change));
}

// +1 up, -1 down, 0 no change. "No change" is 1 for ratios and 0 for differences.
function direction(row) {
    if (row.change === null) return 0;
    const none = row.changeType === 'Ratio' ? 1 : 0;
    return Math.sign(row.change - none);
}

// Multiplying a pre-fire level of 0 always gives 0, so there's no usable level
function hasLevel(row) {
    return row.normal !== null && !(row.changeType === 'Ratio' && row.normal === 0);
}

// |LN(expected / normal)| puts every unit on one scale, and a doubling ranks the same as a halving.
// Without a level, fall back to the typical ratio; differences without a level go last.
function sizeOfChange(row) {
    if (row.normal > 0 && row.expected > 0) return Math.abs(Math.log(row.expected / row.normal));
    if (row.changeType === 'Ratio' && row.change > 0) return Math.abs(Math.log(row.change));
    return -1;
}

const EVIDENCE = [
    { below: 0.01, dots: 3, word: 'Strong' },
    { below: 0.05, dots: 2, word: 'Good' },
    { below: 0.2, dots: 1, word: 'Weak' },
    { below: Infinity, dots: 0, word: 'Little' }
];

function evidenceText(p) {
    const e = EVIDENCE.find(e => (p ?? 1) < e.below);
    if (p === null) return `${e.word} evidence`;
    return `${e.word} evidence: p = ${p < 0.001 ? '< 0.001' : p.toFixed(3)}`;
}

function dots(p, asButton = true) {
    const filled = EVIDENCE.find(e => (p ?? 1) < e.below).dots;
    const inner = [0, 1, 2].map(i => `<i class="${i < filled ? 'on' : ''}"></i>`).join('');
    const label = escapeHtml(evidenceText(p));
    return asButton
        ? `<button type="button" class="dots" title="${label}" aria-label="${label}" aria-expanded="false">${inner}</button>`
        : `<span class="dots" aria-hidden="true">${inner}</span>`;
}

function paramTable(rows) {
    const body = rows.map(r => {
        const dir = direction(r);
        const arrow = dir > 0 ? '▲' : dir < 0 ? '▼' : '';
        return `
            <tr>
                <th scope="row">
                    <span class="pname">${escapeHtml(r.parameter)}${r.parameter === 'Salinity' ? '*' : ''}</span>
                    <span class="psub"><span class="units">${escapeHtml(r.units)}</span>${dots(r.p)}</span>
                    <span class="pinfo" hidden>${escapeHtml(evidenceText(r.p))}</span>
                </th>
                <td>${fmt(r.normal)}</td>
                <td class="expected">${hasLevel(r) ? fmt(r.expected) : '–'}</td>
                <td class="range">${hasLevel(r) && r.low !== null ? `${fmt(r.low)}–${fmt(r.high)}` : '–'}</td>
                <td class="change">${arrow ? `<span class="arrow">${arrow}</span>` : ''}${fmtChange(r)}</td>
            </tr>`;
    }).join('');

    return `
        <table class="ptable">
            <colgroup><col class="c-param"><col class="c-num"><col class="c-num"><col class="c-range"><col class="c-num"></colgroup>
            <thead><tr>
                <th scope="col">Parameter</th><th scope="col">Normal</th><th scope="col">Expected</th>
                <th scope="col">Likely range</th><th scope="col">Change</th>
            </tr></thead>
            <tbody>${body}</tbody>
        </table>`;
}

function rainBox(model, site, win) {
    const r = model.rain(site.name, win);
    if (!r || r.ratio === null) return '';

    const when = CONFIG.windowLong[win] ?? win;
    const compared = r.ratio >= 1.15 ? 'wetter than' : r.ratio <= 0.85 ? 'drier than' : 'about the same as';

    return `
        <div class="rain">
            <div class="rain-head">
                <span class="small muted">Rain at ${escapeHtml(site.name)} after the 2019–20 fire</span>
                <strong class="rain-ratio">${fmt(r.ratio)}× normal</strong>
            </div>
            <p>${escapeHtml(when[0].toUpperCase() + when.slice(1))}: <strong>${fmt(r.inWindow)}mm/day</strong>,
               ${compared} before the fire (${fmt(r.before)}mm/day).</p>
            <p class="small muted">This is what happened in 2019–20, not a forecast, and it doesn't change the predictions.
               The Validation Rain Check found the changes did not grow with rain across estuaries.
               Rain gauge: BoM ${escapeHtml(r.station)} ${cite('dataset')}.</p>
        </div>`;
}

function columnKey(site, rows) {
    const noData = rows.filter(r => r.normal === null).map(r => r.parameter);
    const zero = rows.filter(r => r.changeType === 'Ratio' && r.normal === 0).map(r => r.parameter);
    // The spreadsheet floors salinity at 0psu, because a fixed drop can take a low pre-fire level below 0
    const salinityFloored = rows.some(r => r.parameter === 'Salinity' && (r.low === 0 || r.expected === 0));

    return `
        <h4>What the columns mean</h4>
        <dl class="defs">
            <dt>Normal</dt><dd>${escapeHtml(site.name)}'s average before the fire.</dd>
            <dt>Expected</dt><dd>The normal level with the typical change applied. The change is added for dissolved oxygen, salinity and pH, and multiplied for the others.</dd>
            <dt>Likely range</dt><dd>Where the level would be if this estuary changed like the middle 80% of the 14 monitored estuaries.</dd>
            <dt>Change</dt><dd>The typical change across the 14 monitored estuaries. × means multiplied by; + or − means added or taken away.</dd>
        </dl>
        ${noData.length ? `<p class="small muted">– means there's no pre-fire data at ${escapeHtml(site.name)} for ${escapeHtml(noData.join(', '))}. The typical change still applies.</p>` : ''}
        ${zero.length ? `<p class="small muted">– means the pre-fire level of ${escapeHtml(zero.join(', '))} at ${escapeHtml(site.name)} was 0 (below detection), so multiplying can't give a level. The typical change still applies.</p>` : ''}
        <p class="small muted">* A fall in salinity indicates freshwater inflow after rain (a flood indicator), not a direct fire response.</p>
        ${salinityFloored ? '<p class="small muted">Salinity can\'t fall below 0psu, so its likely range here stops at 0.</p>' : ''}
        <h4>Evidence (dots)</h4>
        <p class="small muted">How consistently the estuaries changed the same way. Tap the dots for the p-value.</p>
        <ul class="dot-key">
            <li>${dots(0.001, false)} Strong (p &lt; 0.01)</li>
            <li>${dots(0.03, false)} Good (p &lt; 0.05)</li>
            <li>${dots(0.1, false)} Weak (p &lt; 0.2)</li>
            <li>${dots(0.5, false)} Little (p ≥ 0.2)</li>
        </ul>`;
}

function createPanel(el, model, on) {
    let current = null;
    let win = model.windows.includes(CONFIG.defaultWindow) ? CONFIG.defaultWindow : model.windows[0];

    function render() {
        const { estuary, latlng, outlookAbove, fromMarker } = current;
        const site = estuary.site;
        const type = CONFIG.estuaryTypes[site.type];
        const typeName = type.label === 'ICOLL' ? 'an ICOLL' : 'a river estuary';
        const rows = model.params(site.name, win);
        const bySize = (a, b) => sizeOfChange(b) - sizeOfChange(a);
        const consistent = rows.filter(r => r.consistent).sort(bySize);
        const others = rows.filter(r => !r.consistent).sort(bySize);
        const days = site.daysBurning ? ` (${site.daysBurning} days)` : '';

        const basis = fromMarker ? 'Monitored estuary'
            : estuary.monitored ? `This land drains to <strong>${escapeHtml(site.name)}</strong>, a monitored estuary`
            : `This land drains to <strong>${escapeHtml(estuary.name)}</strong>, which was not monitored`;

        el.innerHTML = `
            <button class="handle" type="button" aria-label="Expand or collapse"><span></span></button>

            <header class="panel-head">
                <div>
                    <div class="kicker">If a bushfire burns this catchment…</div>
                    <h2>${escapeHtml(estuary.name)}</h2>
                    ${estuary.monitored ? `<div class="chips">
                        <span class="chip chip-navy">${escapeHtml(type.label)}</span>
                        <span class="chip">${escapeHtml(site.region)}</span>
                    </div>` : ''}
                </div>
                <button class="close" type="button" aria-label="Close">×</button>
            </header>

            <div class="box facts">
                <p class="coords">${latlng.lat.toFixed(2)}°, ${latlng.lng.toFixed(2)}°</p>
                <p>${basis}</p>
                <p>Bushfire outlook here (Spring 2026):
                   <span class="chip ${outlookAbove ? 'chip-red' : ''}">${outlookAbove ? 'Above normal' : 'Normal'} bushfire potential</span></p>
                <details>
                    <summary>What is ${typeName}? <span class="chev"></span></summary>
                    <p><strong>${escapeHtml(type.name)}.</strong> ${escapeHtml(type.text)} ${cite(type.ref)}</p>
                </details>
            </div>

            ${estuary.monitored ? '' : `
            <div class="warn">${escapeHtml(estuary.name)} was not monitored, so these values use the monitored estuary
                nearest its mouth: <strong>${escapeHtml(site.name)}</strong> (${typeName}, ${escapeHtml(site.region)}),
                ${Math.round(estuary.km)}km away. Treat them as indicative only.</div>`}

            <div class="box outline">
                <div class="small muted">Fire measured at ${escapeHtml(site.name)} (2019–20)</div>
                <strong>${escapeHtml(site.fire)}</strong>
                <div class="muted">${escapeHtml(site.ignited)} – ${escapeHtml(site.extinguished)}${days}</div>
            </div>

            <div class="seg-wrap" role="group" aria-label="Time after the fire">
                ${model.windows.map(w => `<button type="button" class="seg${w === win ? ' on' : ''}" data-win="${escapeHtml(w)}"
                    aria-pressed="${w === win}">${escapeHtml(CONFIG.windowShort[w] ?? w)}</button>`).join('')}
            </div>

            ${rainBox(model, site, win)}

            <p class="lead">Expected water quality ${escapeHtml(CONFIG.windowLong[win] ?? win)}:</p>

            <section>
                <h3>Consistent changes <span>Most estuaries changed this way (p &lt; 0.05). Largest change first.</span></h3>
                ${consistent.length ? paramTable(consistent)
                    : '<p class="empty">No parameter changed consistently across estuaries in this window.</p>'}
            </section>

            <section class="less">
                <h3>Less certain changes <span>Estuaries did not all change the same way. Largest change first.</span></h3>
                ${paramTable(others)}
            </section>

            <footer class="panel-foot">
                ${columnKey(site, rows)}
                <div class="foot-actions">
                    <button type="button" class="link-btn" data-action="copy">Copy link to this view</button>
                    <button type="button" class="link-btn" data-action="about">About this map</button>
                </div>
            </footer>`;

        el.querySelector('.close').onclick = on.close;
        el.querySelector('.handle').onclick = () => el.classList.toggle('expanded');
        el.querySelector('[data-action="copy"]').onclick = e => on.copy(e.target);
        el.querySelector('[data-action="about"]').onclick = on.about;
        el.querySelectorAll('.seg').forEach(b => b.onclick = () => {
            win = b.dataset.win;
            render();
            on.windowChange(win);
        });
        el.querySelectorAll('button.dots').forEach(b => b.onclick = () => {
            const info = b.closest('th').querySelector('.pinfo');
            info.hidden = !info.hidden;
            b.setAttribute('aria-expanded', !info.hidden);
        });
    }

    return {
        show(state) {
            current = state;
            el.hidden = false;
            el.scrollTop = 0;
            render();
        },
        hide() {
            current = null;
            el.hidden = true;
            el.classList.remove('expanded');
        },
        get window() { return win; },
        set window(w) { if (model.windows.includes(w)) win = w; }
    };
}
