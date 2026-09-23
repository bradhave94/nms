# Base power inventory cross-check

Checked 2026-09-22. Values below come from the game table, not copied from wiki tables. All 2,124 objects in the checked-in table were compared with the independently decoded installed-game table: their LinkGridData records match exactly.

## Selectable planetary consumers

Planet build eligibility and build-menu visibility determine inclusion. Snap-only parts are included. All devices are budgeted as active; runtime exceptions are documented in the main audit. Hidden door appearance variants use their visible parent entry.

| Part | Game ID | kP/s |
| --- | --- | ---: |
| Alloy Power Door | `F_GDOOR` | 1 |
| Appearance Modifier | `DRESSING_TABLE` | 50 |
| Automated Feeder | `CREATURE_FEED` | 20 |
| Base Teleport Module | `TELEPORTER` | 20 |
| Bio-dome | `BIOROOM` | 50 |
| Blue Light | `WALLLIGHTBLUE` | 1 |
| Bytebeat Device | `BYTEBEAT` | 3 |
| Capped Standing Light | `BUILDLIGHT3` | 1 |
| Ceiling Light | `CEILINGLIGHT` | 1 |
| Concrete Power Door | `C_GDOOR` | 1 |
| Cuboid Room | `CUBEROOM` | 5 |
| Cuboid Room Flooring | `CUBEFLOOR` | 1 |
| Curved Corridor | `CORRIDORC` | 1 |
| Curved Cuboid Roof | `CURVEDCUBEROOF` | 5 |
| Curved Cuboid Wall | `CUBEROOMCURVED` | 5 |
| Cylindrical Room | `MAINROOM` | 10 |
| Deepwater Chamber | `MAINROOM_WATER` | 10 |
| Door | `BUILDDOOR` | 1 |
| Gas Extractor | `U_GASEXTRACTOR` | 50 |
| Glass Roofed Corridor | `GLASSCORRIDOR` | 1 |
| Glass Tunnel | `CORRIDOR_WATER` | 1 |
| Green Light | `WALLLIGHTGREEN` | 1 |
| Hazard Protection Unit | `SHIELDSTATION` | 10 |
| Health Station | `HEALTHSTATION` | 10 |
| Holo-door | `DOOR2` | 1 |
| Hydroponic Tray | `PLANTER` | 5 |
| L-shaped Corridor | `CORRIDORL` | 1 |
| L-shaped Glass Tunnel | `CORRIDORL_WATER` | 1 |
| LIGHT BOX | `LIGHTBOX` | 1 |
| LIGHT FLOOR | `L_FLOOR_Q` | 1 |
| Lantern | `SMALLLIGHT` | 1 |
| Large Hydroponic Tray | `PLANTERMEGA` | 20 |
| Livestock Unit | `CREATURE_FARM` | 20 |
| Metal Power Door | `M_GDOOR` | 1 |
| Mineral Extractor | `U_EXTRACTOR_S` | 50 |
| Noise Box | `NOISEBOX` | 1 |
| Pink Light | `WALLLIGHTPINK` | 1 |
| Red Light | `WALLLIGHTRED` | 1 |
| Rounded Standing Light | `BUILDLIGHT2` | 1 |
| Salvaged Power Door | `B_GDOOR` | 1 |
| Short-range Teleporter | `U_MINIPORTAL` | 5 |
| Small Aquarium | `BASE_AQUARIUM` | 5 |
| Square Deepwater Chamber | `MAINROOMCUBE_W` | 30 |
| Square Room | `MAINROOMCUBE` | 10 |
| Squared Standing Light | `BUILDLIGHT` | 1 |
| Standing Planter | `CARBONPLANTER` | 5 |
| Stone Power Door | `S_GDOOR` | 1 |
| Storage Container | `CONTAINER0` | 5 |
| Storage Container | `CONTAINER1` | 5 |
| Storage Container | `CONTAINER2` | 5 |
| Storage Container | `CONTAINER3` | 5 |
| Storage Container | `CONTAINER4` | 5 |
| Storage Container | `CONTAINER5` | 5 |
| Storage Container | `CONTAINER6` | 5 |
| Storage Container | `CONTAINER7` | 5 |
| Storage Container | `CONTAINER8` | 5 |
| Storage Container | `CONTAINER9` | 5 |
| Straight Corridor | `CORRIDOR` | 1 |
| T-shaped Corridor | `CORRIDORT` | 1 |
| T-shaped Glass Tunnel | `CORRIDORT_WATER` | 1 |
| Timber Power Door | `T_GDOOR` | 1 |
| Vertical Glass Tunnel | `CORRIDORV_WATER` | 1 |
| Viewing Sphere | `VIEWSPHERE` | 1 |
| Watertight Door | `BUILDDOOR_WATER` | 2 |
| White Light | `WALLLIGHTWHITE` | 1 |
| Wooden Power Door | `W_GDOOR` | 1 |
| X-shaped Corridor | `CORRIDORX` | 1 |
| X-shaped Glass Tunnel | `CORRIDORX_WATER` | 1 |
| Yellow Light | `WALLLIGHTYELLOW` | 1 |

## Connected parts with zero draw

These are preserved by the extractor and shown separately from the consumer selector.

- Auto Switch (`U_TRANSISTOR2`)
- Button (`U_SWITCHBUTTON`)
- Bytebeat Switch (`BYTEBEATSWITCH`)
- Cuboid Room Frame (`CUBEFRAME`)
- Cylindrical Room Frame (`MAINROOMFRAME`)
- Electrical Wiring (`U_POWERLINE`)
- Floor Switch (`U_SWITCHPRESS`)
- Glass Cuboid Room (`CUBEGLASS`)
- Power Inverter (`U_TRANSISTOR1`)
- Proximity Switch (`U_SWITCHPROX`)
- Solid Cube (`CUBESOLID`)
- Sphere Creator (`SPAWNER_BALL`)
- WALL SWITCH (`U_SWITCHWALL`)

## Generation and storage

| Part | Game ID | Extracted value |
| --- | --- | --- |
| Solar Panel | `U_SOLAR_S` | 50 kP/s; day/night dependency |
| Biofuel Reactor | `U_BIOGENERATOR` | 50 kP/s through a dependent Power connection; primary Fuel storage 180,000 is not electrical storage |
| Electromagnetic Generator | `U_GENERATOR_S` | Base coefficient 1, Power hotspot dependency; class strengths C 150 / B 220 / A 250 / S 300 |
| Battery | `U_BATTERY_S` | 45,000 kP electrical storage |

No other planetary-base electricity producer or electrical-storage item was found. The raw table also contains non-planetary sources listed below. `S_GENERATOR` (Small Generator) has an inert grid and is decorative.

## Exclusions accounted for

- Twelve hidden base/mid/top door variants: `S_GDOOR*`, `T_GDOOR*`, `F_GDOOR*`, `B_GDOOR*`; the visible parent parts are selectable.
- Freighter/corvette-only consumers: `TELEPORTER_F`, `FRE_ROOM_EXTR`, `U_MINIPORTAL_CV`.
- `SET_BYTEBEAT`: settlement-only object; selectable player version is `BYTEBEAT`.
- `B_WALL_PLAN0`: not eligible for a planetary base in the source; excluded.
- `AIRLCKCONNECTOR`: object-only primary Power source with rate 10,000 and storage 1,000; not eligible for planetary bases.
- `U_PARAGON`: object-only primary Power source with rate and storage both 1,000,000; not eligible for planetary bases.
- Crops have zero-rate Power dependencies; their powered trays/rooms are counted instead.
- `BUILDTERMINAL`: zero draw and no active electrical connection; official Frontiers notes confirm power is no longer required.
- Supply pipes, depots, teleport cables and Bytebeat cables are other networks, not additional electrical consumers.

See [the main audit](base-power-data-audit.md) for wiki sources, discrepancies and remaining runtime verification.
