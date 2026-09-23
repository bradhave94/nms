# Base power calculator: data audit

## Independent Luna reviews — 2026-09-23

Three independent reviews covered math, interface/state handling, and extraction/data coverage. Confirmed findings were addressed:

- Replaced the fixed rounding tolerance with a machine-precision-relative check so a real fractional shortfall still adds the next panel, battery or reactor. Added boundary regressions and a repeated-cycle simulation with spare capacity.
- Clear the copy-link confirmation when the plan changes; a delayed clipboard completion cannot label a different URL as copied.
- Corrected the inventory's descriptions of non-planetary power sources `AIRLCKCONNECTOR` and `U_PARAGON`. Their exclusion from the calculator was already correct.
- Future full extractions now record a fresh UTC observation date and the installed Steam build ID when the source installation has a matching app manifest. Other installations retain explicit game-version provenance. Old build IDs are never copied forward, and a pending update's target build is not used.
- Added inventory count checks for 69 consumers and 13 connected zero-draw entries.

The data reviewer compared 192 catalog grid records against raw XML with zero mismatches. Browser checks covered all three source choices through the crafting planner, manual-selection persistence, share-link restoration, validation, copy confirmation, and widths from 320 to 1280 pixels. The extractor suite passes 57 tests; calculator regressions, type-check and lint pass. Exact solar phases, battery discharge caps, and version-specific teleporter behavior remain the documented runtime limits.

## Source-selection follow-up — 2026-09-23

Automatic is now the default source choice. It recommends electromagnetic generation when the solar plan needs at least 20 additional panels, or cannot sustain the configured daylight cycle. This threshold is a product preference, not an extracted game rule. An already adequate solar setup is retained, and explicit solar/electromagnetic/biofuel choices override automatic selection. Electromagnetic recommendations require a suitable hotspot and use the entered output per generator.

Biofuel mode now sizes reactors using their extracted 50 kP/s output, accounts for existing reactors and continuous electromagnetic supply, and generates construction ingredients and crafting-planner links. It assumes reactors remain fueled; solar output is not credited in this mode. Fuel conversion and runtime are still not estimated. Source choice and reactor counts are included in shareable URLs.

Regression checks cover automatic threshold boundaries, large/existing systems, no daylight, reactor rounding and existing supply. Browser checks verified the 10,000 kP/s automatic recommendation, manual solar persistence, switching back to a small load, and biofuel materials/planner output.

## Wiki and full-inventory recheck — 2026-09-22

The calculator now includes **69 planetary consumer entries**, **13 connected zero-draw entries**, all **three generator types**, and the **battery**. The [complete inventory](base-power-inventory.md) lists every included consumer and accounts for excluded raw records. These are source-data coverage claims, not a claim to have tested every device in a running game.

### Corrections made

- Removed the `IsPlaceable` eligibility filter. It excluded **16** legitimate snap-only pieces: six corridor shapes, Viewing Sphere, Cuboid Room Flooring, Door, Holo-door, five underwater tunnels, and Watertight Door. Their rates were already extracted. `BuildableOnPlanetBase` and `ShowInBuildMenu` remain the eligibility checks.
- Retained zero-rate grids when their connection mask is nonzero. This recovers switches, wiring, Sphere Creator, Glass Cuboid Room and structural conductors, plus other-network cables and freighter conductors. Inert decorative grids still produce no metadata. The calculator displays the 13 eligible zero-draw electrical parts separately.
- Compared all **2,124** checked-in building objects with the independently decoded installed-game table. All `LinkGridData` records match exactly. A scan of every primary and dependent Power connection found no additional planetary generator or storage type. Non-planetary sources `AIRLCKCONNECTOR` and `U_PARAGON` are accounted for in the inventory exclusions.
- Added regression checks against the actual imported catalog for snap-only parts, normal consumers, generation/storage, zero-draw connections, and excluded ship/hidden variants.

### Wiki cross-check

The English [Power page](https://nomanssky.fandom.com/wiki/Power) and [power equipment category](https://nomanssky.fandom.com/wiki/Category%3APower_Distribution_Module) cover generation, storage, industry, farming, service devices, lighting and controls. The Power page explicitly labels its consumer list incomplete. Its normal consumer values agree with the extracted records, with the trade-terminal exception below.

The Japanese [electrical equipment reference](https://nomanssky.fandom.com/ja/wiki/%E9%9B%BB%E5%8A%9B%E8%A8%AD%E5%82%99%E3%81%AE%E8%80%83%E5%AF%9F) provides the more complete structural cross-check: corridors/tunnels/flooring at 1, watertight doors at 2, square deepwater chambers at 30, and glass cuboid rooms at 0. These match our raw table. The [Storage Container](https://nomanssky.fandom.com/wiki/Storage_Container), [Large Hydroponic Tray](https://nomanssky.fandom.com/wiki/Large_Hydroponic_Tray), and [Sphere Creator](https://nomanssky.fandom.com/wiki/Sphere_Creator) pages also agree with the extracted values of 5, 20 and zero draw, respectively.

### Discrepancies and limits

- **Galactic Trade Terminal:** the Power page still lists 15 kP/s. Our source has zero and no electrical connection. Hello Games explicitly removed its power requirement in the [Frontiers release notes](https://www.nomanssky.com/frontiers-update/). Do not restore that obsolete consumer entry.
- **Small Generator:** this is an ornament, not a fourth power source. Both its inert game record and [wiki description](https://nomanssky.fandom.com/wiki/Small_Generator) confirm that distinction.
- **Short-range Teleporter:** the source retains a -5 Power dependency, while its [wiki page](https://nomanssky.fandom.com/wiki/Short-Range_Teleporter) describes versions that allow travel unpowered. Keep the extracted budget for powered units and explicitly recommend measured-grid mode when runtime behavior differs. Do not overwrite extracted data with a historical bug report.
- **Battery discharge:** the [Battery page](https://nomanssky.fandom.com/wiki/Battery) claims a 50 kP/s per-unit limit. The building record establishes capacity but no discharge cap, and a globals search found no corroborating base-battery cap. The calculator currently sizes by energy; its default 900-second night already implies at least one battery per 50 kP/s of residual load. Short custom nights can recommend fewer, so the UI now exposes this unverified limit. A current in-game discharge test remains needed before declaring custom-phase results exact.
- **Solar phases/poles:** the wiki corroborates full/half/zero output, but exact local phase durations remain adjustable assumptions. A 1,800-second cycle alone does not establish the phase lengths.
- **Fuel runtime:** electrical output and raw fuel storage/rate are extracted; fuel-item conversion and observed runtime remain outside the calculator. No carbon-cost estimate is inferred from electricity storage.

The recheck found no remaining unexplained positive-draw planetary entry in the raw table. Freighter/corvette consumers and hidden appearance variants are deliberately excluded and listed in the inventory. Wiki pages can be incomplete or outdated, so the calculator retains source values and documents unresolved runtime differences.

Verification after corrections: **56 extractor tests passed**, strict extraction/import validation passed, release archive round-trip passed, calculator/catalog regression checks passed, TypeScript and lint passed, and the production build generated **8,596 pages**. The built calculator contains all 69 consumers, 13 zero-draw entries and four generation/storage entries; all their item links resolve.

## Implementation follow-up

Implemented `/calculator/power` and added it to the Calculators navigation. The original investigation below is retained as the record of what was missing before implementation.

- The shared extractor parser now preserves actual network types, signed rates, storage, environmental/hotspot dependencies, and dependent connections. It enriches relevant products across categories and excludes inert default grids.
- Recovered power rules from two previously unused sources: `gcskyglobals.globals.MXML` and `metadata/simulation/scanning/regionhotspotstable.MXML`. A compatible MBINCompiler 7.03.2.2 converted both without warnings. The earlier implausible day length was a compiler-layout mismatch, not usable game data.
- Verified day-cycle length: **1,800 seconds**. Power hotspot class strengths: **C 150, B 220, A 250, S 300**. Mineral and gas class strengths: **1, 1.5, 2, 2.5**. These are source parameters; they do not establish placement falloff, diminishing returns, or a complete production formula.
- Supplemental source MXML and SHA-256 hashes are retained in the extractor's `data/power/`. `PowerRules.json` records Steam build **25320008**, observation date **2026-09-22**, and compiler provenance independently of the existing **7.00** item catalog. The installed game was not updated, and the catalog was not relabeled as a newer release.
- Full refresh now requests both additional source files and regenerates their provenance. Parser-only regeneration verifies and reuses the supplemental inputs. Compiler warnings fail conversion even when the compiler exits with code zero.
- The calculator accepts measured consumption or device quantities, existing panels/batteries/continuous power, spare capacity, and either solar or electromagnetic additions. It produces direct material totals, a crafting-planner link, and shareable URLs.
- Solar sizing checks daily energy replacement and the largest cumulative deficit across a repeating full-sun/dusk/night/dawn schedule. Default phase lengths are explicitly a **15-minute full-sun / 15-minute darkness estimate**. Users can change darkness and total twilight. Twilight is modeled at half output. `SolarSchedule` remains null in extracted rules because the sources do not establish those phases.
- Electromagnetic mode accepts measured output per additional generator. Class-strength buttons are labeled references, not guaranteed placement output. Fuel runtime remains outside this unattended-base calculator.

Verification: extractor unit tests, staged extraction with reports, detached release archive round trip, website calculation tests with independent repeated-cycle simulations, type-check/lint/build, data-import and routing checks. Browser checks covered total/device modes, quantities, existing equipment, materials, invalid inputs, and mobile width. Existing third-party advertising scripts generated unrelated network/console errors during preview.

## Original investigation

Audited 2026-09-22 against the website and sibling `nms-data-extractor` repository. The checked-in extraction manifest labels the data as game 7.00, compiler 7.00.0.1. This is an audit of that snapshot, not proof that it matches the latest installed game.

## Finding

A base power calculator is feasible. Most device values are already in the extractor's `data/mbin/basebuildingobjectstable.MXML`. The website has names, icons, item links, and construction recipes. The main work is preserving and interpreting electrical metadata correctly, plus verifying solar timing.

The existing website JSON is not sufficient for a reliable calculator without extraction changes.

## Values verified in the raw table

Rates below refer to the Power network; storage is energy, not a generation rate. These are table values before environmental or hotspot effects.

| Item ID | Item | Verified electrical value | Website JSON today |
| --- | --- | --- | --- |
| `U_SOLAR_S` | Solar Panel | +50 rate; `DependsOnEnvironment=DayNight` | Recipe/icon present; grid metadata absent |
| `U_BATTERY_S` | Battery | 45,000 storage; zero generation | Recipe/icon present; grid metadata absent |
| `U_BIOGENERATOR` | Biofuel Reactor | +50 through a dependent Power connection | Recipe/icon present; grid metadata absent |
| `U_GENERATOR_S` | Electromagnetic Generator | Base rate 1, scaled by a Power hotspot | Recipe/icon present; grid metadata absent |
| `U_EXTRACTOR_S` | Mineral Extractor | -50 through a dependent Power connection | Recipe/icon present; grid metadata absent |
| `U_GASEXTRACTOR` | Gas Extractor | -50 through a dependent Power connection | Recipe/icon present; grid metadata absent |
| `TELEPORTER` | Base Teleport Module | -20 rate | Recipe/icon present; grid metadata absent |
| `U_MINIPORTAL` | Short-range Teleporter | -5 through a dependent Power connection | Recipe/icon present; grid metadata absent |
| `PLANTER` | Hydroponic Tray | -5 rate | Rate present; network incorrectly null |
| `PLANTERMEGA` | Large Hydroponic Tray | -20 rate | Rate present; network incorrectly null |
| `CUBEROOM` | Cuboid Room | -5 rate | Rate present; network incorrectly null |
| `BIOROOM` | Bio-dome | -50 rate | Rate present; network incorrectly null |

Source: `../nms-data-extractor/data/mbin/basebuildingobjectstable.MXML`, object IDs above. Device construction costs are in `src/datav2/ConstructedTechnology.json` and `src/datav2/Buildings.json`.

## Extraction gaps

1. **Category restriction.** `../nms-data-extractor/extract.py:843`, `enrich_buildings_metadata`, only enriches `Buildings.json`. Actual buildable products also live in `ConstructedTechnology.json`, `Products.json`, and `Corvette.json`.
2. **Broken network parsing.** Both that enrichment function and `../nms-data-extractor/parsers/buildings.py:94` call `get_nested_enum` as though `LinkNetworkType` had another child with the same name. The actual path is `LinkGridData/Connection/Network/LinkNetworkType`, whose final node directly holds `value="Power"` (or another network type). All 62 non-null website `Buildings.json` grid records currently have `Network: null`.
3. **Dependencies omitted.** Both code paths keep only Network, Rate, and Storage. They drop `DependentConnections`, `DependentRate`, and `DependentEffect`. Mineral/gas extractors have a primary **Resources** rate of +100, but consume 50 power through a dependency. Biofuel has a primary **Fuel** rate of -1 and storage of 180,000, but generates 50 power through a dependency. Neither primary rate is its electrical output.
4. **Environmental conditions omitted.** `DependsOnEnvironment` and `DependsOnHotspots` are present in raw MXML but discarded. The electromagnetic generator's rate of 1 must not be presented as its final output.
5. **Zero-valued connections matter.** Crops and switches can depend on power with a zero electrical rate. Preserve these for interpretation, without counting them as consuming power or treating their resource storage as battery capacity.

Across the 2,124 raw objects, 106 have a nonzero primary Power rate/storage or any dependent Power connection (including zero-rate dependencies). Of these:

| Catalog location | Objects | Existing non-null grid metadata |
| --- | ---: | ---: |
| Buildings | 62 | 62, incomplete |
| Constructed technology | 28 | 0 |
| Products | 12 | 0 |
| Corvette | 1 | 0 |
| No matching flat catalog item | 3 | 0 |

Thus **41 existing catalog items lack this metadata**, plus three raw object-only entries (`SET_BYTEBEAT`, `AIRLCKCONNECTOR`, `U_PARAGON`). `B_WALL_PLAN0` is present in Corvette.json. These counts are not a list of 106 selectable electrical consumers. Planet eligibility, aliases, zero-rate dependencies, and special contexts still need filtering.

## Additional data and remaining verification

- **Solar timing:** obtain a verified day length and the actual full/partial/zero-output schedule. The current extraction source list does not include sky globals. Confirm latitude/location effects before advertising an exact overnight minimum.
- **Hotspot scaling:** retain the hotspot dependency now; locate and validate the scaling rules before deriving electromagnetic output from hotspot class or strength. An initial calculator can accept the generator's measured in-game output.
- **Biofuel duration:** raw fuel storage/rate and electrical output are available. Fuel-item conversion and runtime behavior still need validation before estimating carbon requirements.
- **Connection behavior:** retain dependency effects and, if needed, network connection metadata for conditional devices. A constant-load calculator should state that all selected devices are assumed active. It should avoid double-counting crops and their powered trays, and distinguish planetary bases from freighters/corvettes.
- **Industrial production:** the same raw grid records contain resource rate/storage and hotspot dependencies. These could support a later mining/gas planner once scaling, unit conversion, and diminishing returns are verified.

I experimentally unpacked globals into a temporary directory, without changing either repository's managed data. Gameplay and environment globals converted without warnings; building and sky globals emitted an unrecognized-file/compiler compatibility warning. The resulting sky `DayLength=1022739087` is implausible and must not be used. Exit code 0 did not mean a trustworthy conversion. Environment globals expose hotspot placement/falloff fields, but do not establish a complete output formula.

The installed Steam manifest reports build ID `25320008` and target build ID `25351301`; neither establishes a game version by itself. A further attempt to inspect `psarc.pak` with the extractor's HGPAK reader failed because it is not recognized as HGPAK. A complete refresh needs installation/compiler/archive compatibility checked first. This does not block recovering electrical metadata from the already checked-in 7.00 table.

## Recommended implementation

1. Add one shared grid parser and use it wherever base-building objects enrich catalog items. Preserve network, signed rate, storage, environmental/hotspot conditions, and all dependent connections. Join by exact game ID across categories.
2. Derive a small calculator dataset with explicit electrical consumption, generation, battery capacity, conditions, and source provenance. Keep resource/fuel rates separate. Represent unknown output explicitly instead of silently using zero.
3. Add regression tests for the actual XML shapes: solar, battery, both extractors, biofuel, electromagnetic generator, a normal consumer, and zero-rate power dependencies. Exercise enrichment outside Buildings, plus category/alias filtering.
4. Regenerate in a staged extractor check, run its required checks, then import through the website's existing manifest-validated data workflow. Keep extraction fixes distinct from newly introduced game items in release reports.
5. Add `/calculator/power` using the site's existing static Astro/client-side calculator pattern and Calculators navigation.

Suggested first version:

- Enter the base's measured total power draw, or select devices and quantities.
- Account for existing solar panels, batteries, and measured continuous generation.
- Show recommended panel/battery counts, generation surplus, overnight storage required, and additional parts needed.
- Show a construction shopping list using existing `RequiredItems`, with links to the crafting planner.
- Expose timing assumptions and optional spare capacity. Treat biofuel as fuel-dependent supply.

For a simplified model with constant load `L`, continuous generation `G`, panel output `P`, daylight `D` seconds, night `N` seconds, and battery capacity `C`, define `R=max(0,L-G)`. Panel count must satisfy `panels*P*D >= R*(D+N)` and battery count must satisfy `batteries*C >= R*N`. These formulas assume constant full output throughout daylight and no twilight; they are not yet a verified model of the game's solar cycle. A validated piecewise solar schedule should also check the largest accumulated energy deficit and successful recharge across repeated cycles.

No runtime code, extraction output, or published website behavior was changed by this audit.
