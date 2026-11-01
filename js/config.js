// Settings and wording. Everything you might want to edit by hand is here.

const CONFIG = {
    files: {
        model: 'data/map_export.csv',
        catchments: 'data/estuary_catchments.geojson',
        nsw: 'data/nsw_boundary.geojson',
        outlook: 'data/outlook_spring2026_nsw.geojson'
    },

    startBounds: [[-37.6, 148.6], [-28.1, 153.7]],
    // Generous, because a tall phone screen at minZoom already sees more than NSW
    maxBounds: [[-45.0, 140.0], [-21.0, 161.0]],
    minZoom: 6,

    defaultWindow: '0-3 months',

    navy: '#244061',
    red: '#E31E27',

    windowShort: {
        'During': 'During',
        '0-3 months': '0–3 mo',
        '3-12 months': '3–12 mo',
        '1-2 years': '1–2 yr',
        '2+ years': '2+ yr'
    },

    windowLong: {
        'During': 'while the fire was burning',
        '0-3 months': 'in the first 3 months after the fire was extinguished',
        '3-12 months': '3 to 12 months after the fire was extinguished',
        '1-2 years': '1 to 2 years after the fire was extinguished',
        '2+ years': 'more than 2 years after the fire was extinguished'
    },

    // ref = id in the reference list below
    estuaryTypes: {
        ICOLL: {
            label: 'ICOLL',
            name: 'Intermittently closed and open lake or lagoon',
            text: 'An estuary whose entrance naturally becomes blocked by a build-up of sand, then opens again when the water level is high enough to overtop it.',
            ref: 'entrance'
        },
        River: {
            label: 'River',
            name: 'River estuary',
            text: 'Where a river meets the sea. Drowned river valleys are large and usually deep, and their entrance does not close; barrier rivers are usually shallow, and some can close during periods of low freshwater flow.',
            ref: 'types'
        }
    },

    // IEEE style: author, "title," site, date. URL (accessed date).
    // Listed in the order they're first cited in the About dialog; numbers come from this order (see cite)
    references: [
        { id: 'catchments', text: 'NSW Office of Environment and Heritage, \u201cEstuary Drainage Catchments,\u201d Data.NSW, Jul. 23, 2010.', url: 'https://data.nsw.gov.au/data/dataset/estuary-drainage-catchmentseafb7', accessed: 'Nov. 01, 2026' },
        { id: 'afac', text: 'Australasian Fire and Emergency Service Authorities Council, \u201cSeasonal Bushfire Outlook: Spring 2026,\u201d AFAC.', url: 'https://www.afac.com.au/public-resources/seasonal-bushfire-outlook-spring-2026', accessed: 'Sep. 11, 2026' },
        { id: 'dataset', text: 'NSW Department of Climate Change, Energy, the Environment and Water, \u201c2019/2020 Bushfire Inquiry project water quality dataset,\u201d Data.NSW.', url: 'https://data.nsw.gov.au/data/dataset/9e9b4c96-1a68-4dea-a5b0-23dd4cba9839', accessed: 'Jun. 05, 2026' },
        { id: 'estuaries', text: 'NSW Department of Climate Change, Energy, the Environment and Water, \u201cEstuaries of NSW,\u201d NSW Environment and Heritage.', url: 'https://www.environment.nsw.gov.au/topics/water/estuaries/estuaries-of-nsw', accessed: 'Nov. 01, 2026' },
        { id: 'entrance', text: 'NSW Department of Climate Change, Energy, the Environment and Water, \u201cEstuary entrance management,\u201d NSW Environment and Heritage.', url: 'https://www.environment.nsw.gov.au/topics/water/estuaries/protecting-and-managing-estuaries/estuary-entrance-management', accessed: 'Nov. 01, 2026' },
        { id: 'types', text: 'NSW Department of Climate Change, Energy, the Environment and Water, \u201cTypes of estuaries,\u201d NSW Environment and Heritage.', url: 'https://www.environment.nsw.gov.au/topics/water/estuaries/about-estuaries/types-of-estuaries', accessed: 'Nov. 01, 2026' },
        { id: 'boundary', text: 'R. Hogan, \u201caustralian-states: Australian state boundaries GeoJSON,\u201d GitHub.', url: 'https://github.com/rowanhogan/australian-states', accessed: 'Nov. 01, 2026' },
        { id: 'osm', text: 'OpenStreetMap contributors, \u201cOpenStreetMap,\u201d OpenStreetMap Foundation.', url: 'https://www.openstreetmap.org', accessed: 'Sep. 11, 2026' },
        { id: 'leaflet', text: 'V. Agafonkin, \u201cLeaflet,\u201d ver. 1.9.4.', url: 'https://leafletjs.com', accessed: 'Sep. 11, 2026' }
    ]
};

// Citation number for a reference id, e.g. cite('afac') gives '[2]'
function cite(id) {
    const n = CONFIG.references.findIndex(r => r.id === id) + 1;
    if (!n) throw new Error(`No reference with id ${id}`);
    return `[${n}]`;
}
