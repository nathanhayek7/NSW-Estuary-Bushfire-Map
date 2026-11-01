// Loads the data files. Every number shown on the map comes from the Map Export
// sheet of the spreadsheet model; nothing is calculated from the water quality data here.

function parseCsv(text) {
    const rows = [];
    let row = [], field = '', quoted = false;

    text = text.replace(/^﻿/, '');
    for (let i = 0; i < text.length; i++) {
        const ch = text[i];
        if (quoted) {
            if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
            else if (ch === '"') quoted = false;
            else field += ch;
        } else if (ch === '"') {
            quoted = true;
        } else if (ch === ',') {
            row.push(field); field = '';
        } else if (ch === '\n' || ch === '\r') {
            if (ch === '\r' && text[i + 1] === '\n') i++;
            row.push(field); rows.push(row);
            row = []; field = '';
        } else {
            field += ch;
        }
    }
    if (field || row.length) { row.push(field); rows.push(row); }

    return rows.filter(r => r.some(v => v.trim()));
}

function toNumber(v) {
    const n = parseFloat(String(v ?? '').replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
}

async function fetchOk(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Could not load ${url}`);
    return res;
}

async function loadModel() {
    const rows = parseCsv(await (await fetchOk(CONFIG.files.model)).text());
    const header = rows[0].map(h => h.trim());
    const col = name => header.indexOf(name);

    const sites = {}, params = {}, rain = {}, windows = [];

    for (const r of rows.slice(1)) {
        const get = name => (r[col(name)] ?? '').trim();
        const name = get('Site');
        const win = get('Window');
        const key = `${name}|${win}`;

        sites[name] ??= {
            name,
            lat: toNumber(get('Latitude')),
            lng: toNumber(get('Longitude')),
            region: get('Region'),
            type: get('Estuary type'),
            fire: get('Fire(s)'),
            ignited: get('Ignited'),
            extinguished: get('Extinguished'),
            daysBurning: toNumber(get('Days burning'))
        };

        if (!windows.includes(win)) windows.push(win);

        // The rain columns repeat on every parameter row, so keep the first
        rain[key] ??= {
            station: get('Rain station'),
            before: toNumber(get('Rain before fire (mm/day)')),
            inWindow: toNumber(get('Rain in window (mm/day)')),
            ratio: toNumber(get('Rain vs before'))
        };

        (params[key] ??= []).push({
            parameter: get('Parameter'),
            units: get('Units'),
            changeType: get('Change type'),
            normal: toNumber(get('Normal level (before fire)')),
            change: toNumber(get('Typical change')),
            expected: toNumber(get('Expected level')),
            low: toNumber(get('Likely low')),
            high: toNumber(get('Likely high')),
            p: toNumber(get('p-value')),
            consistent: get('Consistent change?') === 'Yes'
        });
    }

    return {
        sites,
        siteList: Object.values(sites).sort((a, b) => b.lat - a.lat),   // north to south
        windows,
        params: (site, win) => params[`${site}|${win}`] ?? [],
        rain: (site, win) => rain[`${site}|${win}`] ?? null
    };
}

// Works out which estuary a point drains to, and which monitored estuary to use for it.
function createEstuaryFinder(catchments, model) {
    const findCatchment = indexFeatures(catchments);
    const cache = new Map();

    function nearestSite(latlng) {
        return model.siteList
            .map(site => ({ site, km: distanceKm(latlng, site) }))
            .reduce((a, b) => (b.km < a.km ? b : a));
    }

    // Unmonitored estuaries use the monitored estuary nearest their mouth, so every
    // point in one catchment gets the same answer.
    function describe(feature) {
        if (!cache.has(feature)) {
            const p = feature.properties;
            const monitored = p.model_site && model.sites[p.model_site];
            const mouth = monitored ? null : estuaryMouth(feature);
            const used = monitored ? { site: monitored, km: 0 } : nearestSite(mouth);
            cache.set(feature, {
                feature,
                name: monitored ? monitored.name : titleCase(p.CatchmentN),
                monitored: !!monitored,
                site: used.site,
                km: used.km
            });
        }
        return cache.get(feature);
    }

    const bySite = {};
    for (const f of catchments.features) {
        if (f.properties.model_site) bySite[f.properties.model_site] = f;
    }

    return {
        at(latlng) {
            const f = findCatchment(latlng);
            if (!f) return { kind: 'inland' };
            if (f.properties.TYPE === 'NIL ESTUARY') return { kind: 'sea' };
            return { kind: 'estuary', ...describe(f) };
        },
        forSite(site) {
            const f = bySite[site.name];
            return f ? describe(f) : { feature: null, name: site.name, monitored: true, site, km: 0 };
        }
    };
}

async function loadAll() {
    const json = async url => (await fetchOk(url)).json();
    const [model, catchments, nsw, outlook] = await Promise.all([
        loadModel(),
        json(CONFIG.files.catchments),
        json(CONFIG.files.nsw),
        json(CONFIG.files.outlook)
    ]);

    const inNsw = indexFeatures(nsw);
    const inOutlook = indexFeatures(outlook);

    return {
        model,
        catchments,
        outlook,
        estuaries: createEstuaryFinder(catchments, model),
        inNsw: latlng => !!inNsw(latlng),
        inOutlook: latlng => !!inOutlook(latlng)
    };
}
