# Bushfires and estuary water quality: coastal NSW

A Leaflet map for the Thesis B water quality model. Tap on land along the NSW coast to see what a bushfire there would do to water quality in the estuary that land drains into. The AFAC Spring 2026 bushfire outlook is shown alongside.

## Running it

The page has to be served, not opened as a file, or the data won't load.

- VS Code: install the Live Server extension, open this folder and click Go Live.
- Terminal: `python -m http.server 8000` in this folder, then open http://localhost:8000.

To publish on GitHub Pages, put the contents of this folder in a repository with `index.html` at the top, then under Settings > Pages choose "Deploy from a branch", `main`, `/ (root)`.

## Updating the model data

The map doesn't calculate anything from the water quality data. Every number comes from the Map Export sheet of the spreadsheet.

1. In Google Sheets, open Map Export and choose File > Download > Comma-separated values.
2. Rename the file `map_export.csv` and replace `data/map_export.csv`.

Columns are read by heading, so leave the headings as they are.

## What happens on a tap

1. Outside NSW (another state, the ACT or the sea): a message, no prediction.
2. The point is matched to an estuary drainage catchment.
   - One of the 14 monitored estuaries: that estuary's predictions.
   - Another estuary: the monitored estuary nearest that estuary's mouth, with a warning. Using the mouth rather than the tap means every tap in a catchment gives the same answer. `EstuaryNo` in the catchment data is the mouth's latitude; the mouth is the most easterly point of the catchment at that latitude. For the 14 monitored estuaries this lands within about 2km of their published locations.
   - Land draining straight to the sea ("NIL ESTUARY"), or land outside every catchment (inland of the Great Dividing Range): a message that the model doesn't apply.
3. The panel shows the estuary, the 2019–20 fire measured there, the time window buttons, the rain after that fire (context only) and two tables.
   - Consistent changes (p < 0.05) come first, then less certain changes.
   - Each table is sorted by size of change, |LN(expected / normal)|, which puts different units on one scale. Without a normal level, ratio parameters use |LN(typical ratio)|.
   - The dots show how strong the evidence is: three for p < 0.01, two for p < 0.05, one for p < 0.2, none otherwise. Tap them for the p-value.
   - A missing pre-fire level, or a level of 0 for a multiplied parameter, shows as "–" with a note.
   - Salinity levels are floored at 0psu in the spreadsheet (PREDICT and Map Export), so a likely low of 0 gets a short note.

The address updates as you go, so a view can be shared, e.g. `#site=Wallaga%20Lake&w=1-2%20years`.

## Data files

| File | Source | Preparation |
|---|---|---|
| `data/map_export.csv` | Map Export sheet | Downloaded as CSV |
| `data/estuary_catchments.geojson` | NSW OEH (now DCCEEW), Estuary Drainage Catchments, 2011, CC BY 3.0 AU | GDA94 used as is (within about 2m of WGS84). Each polygon simplified to about 100m (0.001°), coordinates rounded to 4 decimal places. Kept `CatchmentN`, `TYPE` and `EstuaryNo`; added `model_site` for the 14 monitored estuaries (Conjola Lake = Lake Conjola, Wapengo Lagoon = Wapengo Lake, the rest match by name). All 658 polygons kept. |
| `data/outlook_spring2026_nsw.geojson` | AFAC, Seasonal Bushfire Outlook: Spring 2026, NSW map | The red (above normal) areas traced from the published image (3508 × 2480px, about 0.006° per pixel) and smoothed to about 200m. Only as accurate as the image, roughly 0.5km. AFAC only publishes images; check their terms before publishing beyond the thesis. |
| `data/nsw_boundary.geojson` | State boundary file from R. Hogan's australian-states (GitHub) | NSW only, coordinates rounded to 4 decimal places. Used to check that a tap is in NSW. |

## Code

| File | What it does |
|---|---|
| `js/config.js` | Settings and wording: file paths, colours, time windows, estuary type definitions, references |
| `js/geo.js` | Point-in-polygon, distance, estuary mouth |
| `js/data.js` | Loads the files and works out which estuary a point drains to |
| `js/layers.js` | Basemap, outlook, catchments, selection, estuary markers |
| `js/panel.js` | The prediction panel |
| `js/ui.js` | Title and layer cards, About dialog |
| `js/app.js` | Wires it together: taps, selection, share links |
| `css/map.css` | Styles, with the phone layout at the end |

## References

The reference list is in `js/config.js` in IEEE style and appears in the About dialog. It is ordered by first citation in the About dialog, and the text cites by id (`cite('afac')`), so the numbers follow the list order automatically.
