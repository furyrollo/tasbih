# Sukoon — Digital Tasbih & Dhikr

## Project goal

Sukoon is a calm, browser-based Islamic tasbih counter designed primarily for mobile use while remaining comfortable on desktop. The project is intentionally static and private: it uses vanilla HTML, CSS, and JavaScript with browser `localStorage` only.

This repository contains **Phase 1 — Core Counter** and **Phase 2 — Dua & Dhikr Library**. The counter remains the primary interaction while the new collection extends the page into a calm reading and recitation space.

## Design

The hero counter is an **Islamic geometric ornament** — an 8-point star (rub el hizb) built from two interlocking SVG squares — that doubles as the tap target and the visual identity of the site:

- Large serif numeral in the centre of a layered glass star with a gold gradient trim
- A necklace of **99 prayer beads** circles the ornament and lights up in gold as the milestone progress fills
- Gentle breathing glow when idle, slowly rotating dashed halo, star-shaped ripple on every tap
- Deep emerald + antique gold + warm ivory palette, glassmorphism surfaces, and a faint **zellige mosaic** page background — octagon-and-square Moroccan tilework with a khatim star glazed into each octagon, tinted with the live theme and vignetted so it never competes with the counter
- Light and dark themes tuned for a calm, premium feel

## Completed features

- Large, accessible tap/click counter target shaped as the ornament
- Prayer-bead progress ring that fills toward the selected milestone
- Tap ripple, number tick, breathing idle, and milestone celebration animations
- Keyboard counting with **Space** or **Enter** when no dialog or control has focus
- Separate session and all-time counts
- Automatic persistence of counts and preferences in `localStorage`
- Confirmation dialog before resetting the current session
- Separate, explicit confirmation before clearing the all-time count
- Configurable milestones: 33, 99, or 100
- Configurable milestone behavior:
  - Keep counting
  - Loop the session count to zero
  - Stop at the milestone
- Milestone progress indicator (bead ring), visual celebration, and optional device vibration
- Light and dark appearances
- Responsive mobile-first layout
- Accessible status announcements, focus styles, semantic controls, and reduced-motion support
- Scroll-snapped compact counter that remains available while browsing, with symmetrical
  assisted and choreographed transitions in both directions
- Hero trace of the active dua or dhikr that confirms the choice survived and reopens the
  collection with it expanded
- Expandable, filterable dua and dhikr cards loaded from category JSON files
- Persistent active dhikr pinned flush beneath the compact counter at every scroll position
- Global translation and transliteration visibility settings
- Three selectable, self-hosted Arabic typefaces: Amiri, Scheherazade New, and Noto Naskh Arabic

## Scroll transitions

The counter and the collection are joined by two deliberate, symmetrical transitions
rather than native scroll snapping.

| | Trigger | Result |
| --- | --- | --- |
| Enter compact | Scroll down past 10% of the hero (clamped to 56–96px) | Eased scroll to the library's resting offset |
| Leave compact | Scroll up past the same threshold below the library's resting offset | Eased scroll back to the top of the hero |

The upward assist is intentionally as generous as the downward one. The library's resting
offset is the position where the collection's top edge meets the compact counter, so the
only thing below it is the inert hero spacer — travelling there while scrolling up can
only mean the visitor wants the full counter back, and no reading position can be lost.
Someone reading further down the collection must first scroll back to that offset, so a
single gesture never pulls them out of the text.

Both directions pair the eased `window.scrollTo` flight with dedicated CSS choreography:
the compact bar, ornament, library, and pinned recitation animate into reading mode and
receive matching reverse treatment when the full hero returns.

Both transitions drive `window.scrollTo`, which keeps emitting scroll events for the
duration of the eased flight. Each of those events lands at an intermediate offset that
reads as the opposite gesture, so a programmatic-scroll latch suspends compact-state
changes until the movement settles. Without it the two assists retrigger each other and
the page oscillates.

Every entry into compact mode lands at the library's resting offset. Returning to the
hero never records or restores an earlier reading depth, so scrolling down again always
behaves exactly like the first downward transition.

## Entry URIs

| Path | Parameters | Purpose |
| --- | --- | --- |
| `/index.html` | None | Main and only Phase 1 counter screen |
| `/` | None | Static-host equivalent of the main counter screen |

There are no API endpoints or server routes.

## Data model and storage

All data is stored in the visitor's browser under the `localStorage` key:

```text
sukoon-tasbih-v1
```

Stored object fields:

| Field | Type | Description |
| --- | --- | --- |
| `session` | number | Current session count |
| `lifetime` | number | All-time count, unaffected by a session reset |
| `milestone` | number | Selected target: 33, 99, or 100 |
| `behavior` | string | `keep`, `loop`, or `stop` |
| `theme` | string | `light` or `dark` |
| `vibration` | boolean | Whether supported devices vibrate at milestones |
| `stopped` | boolean | Whether stop-at-milestone is currently active |
| `showTransliteration` | boolean | Whether card transliterations are visible |
| `showTranslation` | boolean | Whether card translations are visible |
| `arabicFont` | string | Selected self-hosted Arabic typeface |
| `activeRecitationId` | string or null | The dua or dhikr pinned beneath the compact counter |

No backend, database, cookies, analytics, authentication, or network data storage is used. Arabic fonts are self-hosted; the Latin UI font stylesheet remains an optional external request with system fallbacks.

## Files

```text
index.html                       Semantic counter, library, cards, and dialog markup
css/style.css                    Responsive styling, compact mode, cards, and themes
js/main.js                       Counter state, manifest loading, filters, settings, and interactions
package.json                     Dependency-free validation, build, and test scripts
data/categories.json             Hand-edited dua and dhikr category taxonomy
data/duas/<category-id>.json     Dua entries grouped by category
data/dhikr/<category-id>.json    Dhikr entries grouped by category
data/manifest.json              Generated file list used by the browser; commit this file
scripts/validate-content.js      Content schema and integrity validation
scripts/build-manifest.js        Validates content and regenerates data/manifest.json
assets/fonts/*.woff2             Self-hosted Arabic typefaces
README.md                        Project documentation
../tests/scroll_flow_test.py     Browser tests for the compact scroll transitions
../tools/gen_zellige.py          Regenerates the zellige background tile in style.css
```

### Regenerating the background tile

The zellige background is a generated SVG tile embedded in `css/style.css` as the
`--zellige` custom property. To change its geometry, edit `tools/gen_zellige.py`,
run `python3 tools/gen_zellige.py`, and paste the printed `--zellige:` line back
over the existing one. The script also writes `tools/zellige.preview.svg` for a
quick look at a single tile.

## Run locally

Open `index.html` through a static web server; `fetch` does not work reliably with a `file://` URL. The committed `data/manifest.json` means no build or package installation is needed to browse the site. With Node.js 18+ available, use `npm run validate` to check content or `npm run build` to regenerate the manifest. There are no npm dependencies to install.

## Content schema

`data/categories.json` is hand-edited and contains separate `dua` and `dhikr` arrays of `{ "id", "label", "description" }` objects. Array order controls category order in the browser. Each file in `data/duas/` or `data/dhikr/` is named after its category ID and contains only an `entries` array:

```json
{
  "entries": [
    {
      "id": "unique-kebab-case-id",
      "arabic": "Arabic text",
      "transliteration": "Transliteration",
      "translation": "Translation",
      "source": "Source reference",
      "recommendedCount": 1,
      "audioUrl": null
    }
  ]
}
```

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Unique across all duas and dhikr; kebab-case; stored in `localStorage` when active |
| `arabic` | string | Arabic-script text; preserve its exact characters and diacritics |
| `transliteration` | string | Non-empty transliteration |
| `translation` | string | Non-empty translation |
| `source` | string | Non-empty source reference |
| `recommendedCount` | positive integer or `null` | Suggested repetition count |
| `audioUrl` | `null` or non-empty string | Reserved for future audio; currently `null` |

Do not put `type` or `category` in an entry. The browser attaches `dua` or `dhikr` from the manifest item's folder and the category from its filename. `data/manifest.json` is generated with `npm run build`, keeps category order from `data/categories.json`, and lists content files in that same deterministic order so card order stays stable. Commit the generated manifest so the site works when served without a build.

## How to add a dua or dhikr

1. Open the existing category file under `data/duas/` or `data/dhikr/`.
2. Paste a new entry into its `entries` array with a unique kebab-case `id` and all required fields. Keep `audioUrl` set to `null`.
3. Run `npm run validate` and fix any reported errors.
4. Commit the changed category file. No manifest change is needed when adding an entry to an existing file.

To add a new category, append its `{ "id", "label", "description" }` object to the appropriate array in `data/categories.json`, create `data/duas/<category-id>.json` or `data/dhikr/<category-id>.json` with an `entries` array, then run `npm run build`. Commit the category definition, content file, and regenerated `data/manifest.json`.

## Cloudflare Pages

Use these project settings:

| Setting | Value |
| --- | --- |
| Framework preset | None |
| Build command | `npm run build` |
| Build output directory | `.` (project root) |

The build validates all content before writing the manifest and needs no dependency installation.

## Netlify

The committed `netlify.toml` configures these project settings:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Publish directory | `.` (project root) |

This site has no generated `dist` directory: the build validates the content and writes
`data/manifest.json` in place. File-based settings in `netlify.toml` take precedence over
conflicting Netlify UI settings, so commit and push the file, then redeploy.

## Not yet implemented

- Audio recitation playback (the schema already reserves `audioUrl`)
- Favorites and saved collections
- Cloud sync, accounts, or cross-device synchronization

## Recommended next steps

1. Validate Phase 1 on physical iOS and Android devices, especially vibration behavior and safe-area spacing.
2. Review and expand the sample dua and dhikr content with a qualified source.
3. Add optional recitation audio and favorites in a later phase without changing the current content schema.

## Public URLs

- Production website: Not published yet
- API endpoints: None
