#!/usr/bin/env python3
"""Generate old->new item URL redirects from JSON datasets.

This script is intended for the old/new dataset migration where old records
live in `sec/data` (or `src/data`) and new records live in `sec/datav2`
(or `src/datav2`).
"""

from __future__ import annotations

import argparse
import json
import re
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Any


# Old data files -> old URL segment used by the site.
OLD_FILE_TO_SOURCE_SEGMENT: dict[str, str] = {
    "Buildings.json": "buildings",
    "ConstructedTechnology.json": "technology",
    "Cooking.json": "cooking",
    "Curiosities.json": "curiosities",
    "Fish.json": "fish",
    "NutrientProcessor.json": "nutrient-processor",
    "Others.json": "other",
    "Products.json": "products",
    "RawMaterials.json": "raw",
    "Refinery.json": "refinery",
    "Technology.json": "technology",
    "TechnologyModule.json": "technology",
    "Trade.json": "other",
}

# Fallback from old ID prefixes when a file-specific mapping is unavailable.
OLD_PREFIX_TO_SOURCE_SEGMENT: dict[str, str] = {
    "raw": "raw",
    "prod": "products",
    "cook": "cooking",
    "cur": "curiosities",
    "fish": "fish",
    "contech": "technology",
    "tech": "technology",
    "tmod": "technology",
    "other": "other",
    "ref": "refinery",
    "nut": "nutrient-processor",
    "build": "buildings",
    "trade": "other",
}

# New files -> default destination segment (used when Slug is missing).
NEW_FILE_TO_DEFAULT_DEST_SEGMENT: dict[str, str] = {
    "Buildings.json": "buildings",
    "ConstructedTechnology.json": "technology",
    "Corvette.json": "corvette",
    "Curiosities.json": "curiosities",
    "Exocraft.json": "exocraft",
    "Fish.json": "fish",
    "Food.json": "food",
    "NutrientProcessor.json": "nutrient-processor",
    "Others.json": "other",
    "Products.json": "products",
    "RawMaterials.json": "raw",
    "Refinery.json": "refinery",
    "Starships.json": "starships",
    "Technology.json": "technology",
    "TechnologyModule.json": "technology",
    "Trade.json": "other",
    "Upgrades.json": "upgrades",
    "none.json": "none",
}

# Matching priority: old file -> most likely new files.
OLD_FILE_TO_NEW_FILE_PRIORITY: dict[str, list[str]] = {
    "RawMaterials.json": ["RawMaterials.json"],
    "Products.json": ["Products.json"],
    "Cooking.json": ["Food.json"],
    "Curiosities.json": ["Curiosities.json"],
    "Fish.json": ["Fish.json"],
    "Buildings.json": ["Buildings.json"],
    "Others.json": ["Others.json", "Trade.json"],
    "Trade.json": ["Trade.json", "Others.json"],
    "ConstructedTechnology.json": [
        "ConstructedTechnology.json",
        "Technology.json",
        "TechnologyModule.json",
        "Upgrades.json",
        "Exocraft.json",
        "Starships.json",
        "Corvette.json",
    ],
    "Technology.json": [
        "Technology.json",
        "ConstructedTechnology.json",
        "TechnologyModule.json",
        "Upgrades.json",
        "Exocraft.json",
        "Starships.json",
        "Corvette.json",
    ],
    "TechnologyModule.json": [
        "TechnologyModule.json",
        "Technology.json",
        "ConstructedTechnology.json",
        "Upgrades.json",
        "Exocraft.json",
        "Starships.json",
        "Corvette.json",
    ],
    "Refinery.json": ["Refinery.json"],
    "NutrientProcessor.json": ["NutrientProcessor.json"],
}

# Destination route preferences by source segment (used to break ties).
SOURCE_SEGMENT_TO_DEST_PREFERENCE: dict[str, list[str]] = {
    "raw": ["raw"],
    "products": ["products"],
    "cooking": ["food", "cooking"],
    "curiosities": ["curiosities"],
    "fish": ["fish"],
    "technology": ["technology", "upgrades", "exocraft", "starships", "corvette"],
    "other": ["other"],
    "buildings": ["buildings"],
    "refinery": ["refinery"],
    "nutrient-processor": ["nutrient-processor"],
}


@dataclass(frozen=True)
class NewRecord:
    file_name: str
    item: dict[str, Any]
    item_id: str
    slug: str | None
    segment: str
    name_key: str | None
    group_key: str | None
    desc_key: str | None
    operation_key: str | None
    base_value: Any


@dataclass(frozen=True)
class OldRecord:
    file_name: str
    item: dict[str, Any]
    item_id: str
    source_segment: str
    source_url: str
    name_key: str | None
    group_key: str | None
    desc_key: str | None
    operation_key: str | None
    base_value: Any


@dataclass(frozen=True)
class AmbiguousEntry:
    old: OldRecord
    candidates: list[NewRecord]


@dataclass
class NewIndexes:
    by_id: dict[str, NewRecord]
    by_name: dict[str, list[NewRecord]]
    by_operation: dict[str, list[NewRecord]]
    by_file_name: dict[str, dict[str, list[NewRecord]]]


def normalize_text(value: Any) -> str:
    """Normalize text for matching."""
    return re.sub(r"\s+", " ", str(value or "").strip()).casefold()


def normalize_operation(value: Any) -> str:
    """Normalize operation labels across old/new formats."""
    op = normalize_text(value)
    for prefix in ("processor setting:", "requested operation:"):
        if op.startswith(prefix):
            op = op[len(prefix) :].strip()
    return op


def trailing_number(value: str) -> int | None:
    """Return trailing integer from ID (e.g. ref31 -> 31), if present."""
    match = re.search(r"(\d+)$", value)
    return int(match.group(1)) if match else None


def id_sort_key(item_id: str) -> tuple[int, str]:
    """Sort by trailing number, then full string."""
    tail = trailing_number(item_id)
    return (tail if tail is not None else 10**9, item_id)


def segment_from_slug(slug: str | None) -> str | None:
    """Extract leading path segment from a slug."""
    if not slug:
        return None
    normalized = str(slug).strip("/")
    if not normalized:
        return None
    return normalized.split("/")[0]


def infer_source_segment(file_name: str, item_id: str) -> str:
    """Infer old source route segment from file name or ID prefix."""
    if file_name in OLD_FILE_TO_SOURCE_SEGMENT:
        return OLD_FILE_TO_SOURCE_SEGMENT[file_name]

    prefix_match = re.match(r"^[A-Za-z]+", item_id or "")
    prefix = prefix_match.group(0).casefold() if prefix_match else ""
    if prefix in OLD_PREFIX_TO_SOURCE_SEGMENT:
        return OLD_PREFIX_TO_SOURCE_SEGMENT[prefix]

    stem = file_name.replace(".json", "")
    return normalize_text(stem).replace(" ", "-")


def infer_destination_segment(file_name: str, slug: str | None) -> str:
    """Infer new destination route segment from Slug or file name."""
    segment = segment_from_slug(slug)
    if segment:
        return segment
    if file_name in NEW_FILE_TO_DEFAULT_DEST_SEGMENT:
        return NEW_FILE_TO_DEFAULT_DEST_SEGMENT[file_name]
    stem = file_name.replace(".json", "")
    return normalize_text(stem).replace(" ", "-")


def load_json_arrays(directory: Path) -> dict[str, list[dict[str, Any]]]:
    """Load all JSON array files in a directory."""
    if not directory.exists():
        raise FileNotFoundError(f"Directory does not exist: {directory}")

    datasets: dict[str, list[dict[str, Any]]] = {}
    for file_path in sorted(directory.glob("*.json")):
        with file_path.open("r", encoding="utf-8") as handle:
            parsed = json.load(handle)
        if not isinstance(parsed, list):
            continue
        normalized_items = [item for item in parsed if isinstance(item, dict)]
        datasets[file_path.name] = normalized_items
    return datasets


def build_new_records(datasets: dict[str, list[dict[str, Any]]]) -> list[NewRecord]:
    """Convert raw new dataset dictionaries into structured records."""
    records: list[NewRecord] = []
    for file_name, items in datasets.items():
        for item in items:
            item_id = str(item.get("Id", "")).strip()
            if not item_id:
                continue
            slug = item.get("Slug")
            slug_str = str(slug).strip() if slug is not None else None
            segment = infer_destination_segment(file_name, slug_str)
            records.append(
                NewRecord(
                    file_name=file_name,
                    item=item,
                    item_id=item_id,
                    slug=slug_str,
                    segment=segment,
                    name_key=normalize_text(item.get("Name")) or None,
                    group_key=normalize_text(item.get("Group")) or None,
                    desc_key=normalize_text(item.get("Description")) or None,
                    operation_key=normalize_operation(item.get("Operation")) or None,
                    base_value=item.get("BaseValueUnits"),
                )
            )
    return records


def build_new_indexes(new_records: list[NewRecord]) -> NewIndexes:
    """Build lookup indexes for fast matching."""
    by_id: dict[str, NewRecord] = {}
    by_name: defaultdict[str, list[NewRecord]] = defaultdict(list)
    by_operation: defaultdict[str, list[NewRecord]] = defaultdict(list)
    by_file_name: defaultdict[str, defaultdict[str, list[NewRecord]]] = defaultdict(
        lambda: defaultdict(list)
    )

    for record in new_records:
        by_id[record.item_id] = record
        if record.name_key:
            by_name[record.name_key].append(record)
            by_file_name[record.file_name][record.name_key].append(record)
        if record.operation_key:
            by_operation[record.operation_key].append(record)

    return NewIndexes(
        by_id=by_id,
        by_name=dict(by_name),
        by_operation=dict(by_operation),
        by_file_name={name: dict(index) for name, index in by_file_name.items()},
    )


def build_old_records(datasets: dict[str, list[dict[str, Any]]]) -> list[OldRecord]:
    """Convert raw old dataset dictionaries into structured records."""
    records: list[OldRecord] = []
    for file_name, items in datasets.items():
        for item in items:
            item_id = str(item.get("Id", "")).strip()
            if not item_id:
                continue
            source_segment = infer_source_segment(file_name, item_id)
            source_url = f"/{source_segment}/{item_id}"
            records.append(
                OldRecord(
                    file_name=file_name,
                    item=item,
                    item_id=item_id,
                    source_segment=source_segment,
                    source_url=source_url,
                    name_key=normalize_text(item.get("Name")) or None,
                    group_key=normalize_text(item.get("Group")) or None,
                    desc_key=normalize_text(item.get("Description")) or None,
                    operation_key=normalize_operation(item.get("Operation")) or None,
                    base_value=item.get("BaseValueUnits"),
                )
            )
    return records


def disambiguate_candidates(candidates: list[NewRecord], old: OldRecord) -> list[NewRecord]:
    """Filter candidates with additional matching hints."""
    filtered = candidates
    if len(filtered) <= 1:
        return filtered

    preferred_segments = SOURCE_SEGMENT_TO_DEST_PREFERENCE.get(
        old.source_segment, [old.source_segment]
    )
    if preferred_segments:
        preferred = [rec for rec in filtered if rec.segment in preferred_segments]
        if len(preferred) == 1:
            return preferred
        if preferred:
            filtered = preferred

    if old.group_key:
        grouped = [rec for rec in filtered if rec.group_key == old.group_key]
        if len(grouped) == 1:
            return grouped
        if grouped:
            filtered = grouped

    if old.desc_key:
        described = [rec for rec in filtered if rec.desc_key == old.desc_key]
        if len(described) == 1:
            return described
        if described:
            filtered = described

    if old.base_value is not None:
        valued = [rec for rec in filtered if rec.base_value == old.base_value]
        if len(valued) == 1:
            return valued
        if valued:
            filtered = valued

    output = old.item.get("Output")
    if isinstance(output, dict) and output.get("Quantity") is not None:
        quantity = output.get("Quantity")
        same_output_qty = [
            rec
            for rec in filtered
            if isinstance(rec.item.get("Output"), dict)
            and rec.item["Output"].get("Quantity") == quantity
        ]
        if len(same_output_qty) == 1:
            return same_output_qty
        if same_output_qty:
            filtered = same_output_qty

    return filtered


def try_internal_recipe_id_match(old: OldRecord, indexes: NewIndexes) -> NewRecord | None:
    """Map old recipe IDs to new recipe IDs when numbering is preserved."""
    number = trailing_number(old.item_id)
    if number is None:
        return None

    if old.file_name == "Refinery.json":
        return indexes.by_id.get(f"REFINERECIPE_{number}")
    if old.file_name == "NutrientProcessor.json":
        return indexes.by_id.get(f"RECIPE_{number}")
    return None


def resolve_bucket_order_ambiguities(
    ambiguous_entries: list[AmbiguousEntry],
) -> tuple[dict[str, NewRecord], list[AmbiguousEntry]]:
    """Resolve some many-to-many ambiguities using stable order when safe."""
    resolved: dict[str, NewRecord] = {}
    still_ambiguous: list[AmbiguousEntry] = []

    buckets: defaultdict[tuple[str, str, str], list[AmbiguousEntry]] = defaultdict(list)
    for entry in ambiguous_entries:
        key_text = entry.old.name_key or entry.old.operation_key or ""
        bucket_key = (entry.old.file_name, entry.old.source_segment, key_text)
        buckets[bucket_key].append(entry)

    for entries in buckets.values():
        if len(entries) < 2:
            still_ambiguous.extend(entries)
            continue

        candidate_sets = [{candidate.item_id for candidate in entry.candidates} for entry in entries]
        first_set = candidate_sets[0]
        if not all(candidate_set == first_set for candidate_set in candidate_sets):
            still_ambiguous.extend(entries)
            continue

        if len(first_set) != len(entries):
            still_ambiguous.extend(entries)
            continue

        id_to_record = {record.item_id: record for record in entries[0].candidates}
        sorted_old = sorted(entries, key=lambda entry: id_sort_key(entry.old.item_id))
        sorted_new = sorted((id_to_record[item_id] for item_id in first_set), key=lambda rec: id_sort_key(rec.item_id))

        for old_entry, new_record in zip(sorted_old, sorted_new):
            resolved[old_entry.old.source_url] = new_record

    return resolved, still_ambiguous


def build_destination_url(record: NewRecord) -> str:
    """Build destination URL from new record slug/id."""
    if record.slug:
        return "/" + record.slug.strip("/")
    return f"/{record.segment}/{record.item_id}"


def generate_redirects(
    old_dir: Path,
    new_dir: Path,
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    """Generate redirects and unmatched entries."""
    old_datasets = load_json_arrays(old_dir)
    new_datasets = load_json_arrays(new_dir)

    old_records = build_old_records(old_datasets)
    new_records = build_new_records(new_datasets)
    indexes = build_new_indexes(new_records)

    matched: dict[str, NewRecord] = {}
    ambiguous_entries: list[AmbiguousEntry] = []
    unmatched_entries: list[dict[str, Any]] = []

    for old in old_records:
        recipe_match = try_internal_recipe_id_match(old, indexes)
        if recipe_match:
            matched[old.source_url] = recipe_match
            continue

        if old.name_key:
            chosen: NewRecord | None = None
            last_ambiguous: list[NewRecord] | None = None

            for file_name in OLD_FILE_TO_NEW_FILE_PRIORITY.get(old.file_name, []):
                file_index = indexes.by_file_name.get(file_name, {})
                candidates = list(file_index.get(old.name_key, []))
                if not candidates:
                    continue
                candidates = disambiguate_candidates(candidates, old)
                if len(candidates) == 1:
                    chosen = candidates[0]
                    break
                if candidates:
                    last_ambiguous = candidates

            if chosen is None:
                candidates = list(indexes.by_name.get(old.name_key, []))
                candidates = disambiguate_candidates(candidates, old)
                if len(candidates) == 1:
                    chosen = candidates[0]
                elif candidates:
                    last_ambiguous = candidates

            if chosen is not None:
                matched[old.source_url] = chosen
            elif last_ambiguous:
                ambiguous_entries.append(AmbiguousEntry(old=old, candidates=last_ambiguous))
            else:
                unmatched_entries.append(
                    {
                        "source": old.source_url,
                        "oldFile": old.file_name,
                        "oldId": old.item_id,
                        "name": old.item.get("Name"),
                        "reason": "no-candidate",
                    }
                )
            continue

        if old.operation_key:
            candidates = list(indexes.by_operation.get(old.operation_key, []))
            candidates = disambiguate_candidates(candidates, old)
            if len(candidates) == 1:
                matched[old.source_url] = candidates[0]
            elif candidates:
                ambiguous_entries.append(AmbiguousEntry(old=old, candidates=candidates))
            else:
                unmatched_entries.append(
                    {
                        "source": old.source_url,
                        "oldFile": old.file_name,
                        "oldId": old.item_id,
                        "operation": old.item.get("Operation"),
                        "reason": "no-candidate",
                    }
                )
            continue

        unmatched_entries.append(
            {
                "source": old.source_url,
                "oldFile": old.file_name,
                "oldId": old.item_id,
                "reason": "no-link-field",
            }
        )

    resolved_from_buckets, still_ambiguous = resolve_bucket_order_ambiguities(ambiguous_entries)
    matched.update(resolved_from_buckets)

    for entry in still_ambiguous:
        unmatched_entries.append(
            {
                "source": entry.old.source_url,
                "oldFile": entry.old.file_name,
                "oldId": entry.old.item_id,
                "name": entry.old.item.get("Name"),
                "operation": entry.old.item.get("Operation"),
                "reason": "ambiguous",
                "candidateIds": sorted({candidate.item_id for candidate in entry.candidates}),
                "candidateDestinations": sorted(
                    {build_destination_url(candidate) for candidate in entry.candidates}
                ),
            }
        )

    redirects = [
        {
            "source": source_url,
            "destination": build_destination_url(new_record),
            "permanent": True,
        }
        for source_url, new_record in matched.items()
    ]
    redirects.sort(key=lambda entry: entry["source"])
    unmatched_entries.sort(key=lambda entry: entry["source"])
    return redirects, unmatched_entries


def default_old_dir() -> Path:
    """Pick old-data directory, preferring sec/data when available."""
    primary = Path("sec/data")
    return primary if primary.exists() else Path("src/data")


def default_new_dir() -> Path:
    """Pick new-data directory, preferring sec/datav2 when available."""
    primary = Path("sec/datav2")
    return primary if primary.exists() else Path("src/datav2")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate migration redirects between old and new item datasets."
    )
    parser.add_argument(
        "--old-dir",
        type=Path,
        default=default_old_dir(),
        help="Directory containing old JSON arrays (default: sec/data or src/data).",
    )
    parser.add_argument(
        "--new-dir",
        type=Path,
        default=default_new_dir(),
        help="Directory containing new JSON arrays (default: sec/datav2 or src/datav2).",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("redirects.json"),
        help="Where to write redirects JSON.",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    redirects, unmatched = generate_redirects(args.old_dir, args.new_dir)

    args.output.parent.mkdir(parents=True, exist_ok=True)
    with args.output.open("w", encoding="utf-8") as handle:
        json.dump(redirects, handle, indent=2)
        handle.write("\n")

    print(f"Wrote {len(redirects)} redirects to {args.output}")
    print(f"Unmatched items: {len(unmatched)}")

    if unmatched:
        reason_counts = Counter(entry["reason"] for entry in unmatched)
        print("Unmatched by reason:")
        for reason, count in sorted(reason_counts.items()):
            print(f"  - {reason}: {count}")

        print("\nUnmatched entries:")
        for entry in unmatched:
            print(json.dumps(entry, ensure_ascii=True))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
