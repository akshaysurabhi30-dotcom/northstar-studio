"""Build a compact, USA-only BasinATLAS dataset for point-in-polygon lookups.

The script intentionally keeps only geometry, the HydroBASINS identifier, and
candidate source attributes used by the operational prototype. The API labels
these values as approximate substitutions for the research inputs.
"""

from __future__ import annotations

import argparse
import gc
import json
import os
import shutil
import urllib.request
import zipfile
from pathlib import Path

import geopandas as gpd
import numpy as np
import pandas as pd
import pyarrow.parquet as pq

ROOT = Path(__file__).resolve().parents[1]
RAW_DIR = ROOT / "data" / "raw"
PROCESSED_DIR = ROOT / "data" / "processed"
OUTPUT_PATH = PROCESSED_DIR / "basins.parquet"
METADATA_PATH = PROCESSED_DIR / "basins.metadata.json"
TILES_DIR = PROCESSED_DIR / "basins_tiles"
TILE_SIZE_DEGREES = 5.0

# Official U.S. Census TIGER/Line state boundaries; excludes territories by default.
US_BOUNDARY_URL = "https://www2.census.gov/geo/tiger/GENZ2023/shp/cb_2023_us_state_500k.zip"
US_STATES_AND_DC = {"AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY", "DC"}

# These are source attributes retained for audit and future use. Only the feature
# mapping document may authorize a model-facing name or conversion.
SOURCE_FIELDS = {
    "HYBAS_ID": "hybas_id",
    "SUB_AREA": "sub_area_km2",
    "UP_AREA": "up_area_km2",
    "ele_mt_sav": "elevation_mean_m_asl_candidate",
    "dis_m3_pyr": "natural_discharge_m3_s_candidate",
    "glc_cl_smj": "landcover_class_glc2000_candidate",
}


def download(url: str, destination: Path) -> Path:
    destination.parent.mkdir(parents=True, exist_ok=True)
    if destination.exists() and destination.stat().st_size > 0:
        return destination
    if destination.exists():
        destination.unlink()
    print(f"Downloading {url} to {destination}")
    with urllib.request.urlopen(url) as response, destination.open("wb") as output:
        shutil.copyfileobj(response, output)
    if destination.stat().st_size == 0:
        destination.unlink(missing_ok=True)
        raise RuntimeError("The download returned an empty file. Download the official archive in a browser from https://www.hydrosheds.org/hydroatlas, extract it, and place the .gdb directory under data/raw/.")
    return destination


def resolve_column(frame: gpd.GeoDataFrame, expected: str) -> str:
    match = next((column for column in frame.columns if column.lower() == expected.lower()), None)
    if match is None:
        raise KeyError(f"Required BasinATLAS field {expected!r} was not found. Available fields: {list(frame.columns)}")
    return match


def load_basinatlas(path: Path, layer: str, columns: list[str] | None = None, rows: int | None = None, bbox: tuple[float, float, float, float] | None = None) -> gpd.GeoDataFrame:
    if path.suffix.lower() == ".gdb":
        return gpd.read_file(path, layer=layer, columns=columns, rows=rows, bbox=bbox)
    return gpd.read_file(path, columns=columns, rows=rows, bbox=bbox)


def load_usa_regions(path: Path, layer: str, columns: list[str], usa_geometry) -> gpd.GeoDataFrame:
    """Read U.S. regions through the GeoDatabase spatial index.

    BasinATLAS Level 12 has over one million global polygons. Reading all of
    them just to discard most of the world is memory-intensive on a local
    machine. The source is EPSG:4326, so these three envelope queries retain
    the 50 states and DC while keeping the final precise state-boundary filter.
    """
    usa_envelopes = [
        (-125.0, 24.0, -66.0, 50.0),  # contiguous states + DC
        (-180.0, 50.0, -129.0, 73.0),  # Alaska
        (-162.0, 18.0, -153.0, 24.0),  # Hawaii
    ]
    frames: list[gpd.GeoDataFrame] = []
    # Small tiles stop one read from materializing most of the global level-12
    # layer in memory. A slight overlap avoids missing a catchment on a tile edge.
    for min_x, min_y, max_x, max_y in usa_envelopes:
        for x in np.arange(min_x, max_x, 5.0):
            for y in np.arange(min_y, max_y, 5.0):
                bounds = (float(x - 0.01), float(y - 0.01), float(min(x + 5.0, max_x) + 0.01), float(min(y + 5.0, max_y) + 0.01))
                tile = load_basinatlas(path, layer, columns=columns, bbox=bounds)
                if not tile.empty:
                    # Discard non-U.S. rows before retaining the next tile.
                    tile = tile.loc[tile.intersects(usa_geometry)].copy()
                    if not tile.empty:
                        frames.append(tile)
                print(f"Read tile {bounds}; retained {len(tile):,} catchments", flush=True)
    if not frames:
        raise ValueError("No BasinATLAS features were found in the U.S. geographic envelopes.")
    result = gpd.GeoDataFrame(pd.concat(frames, ignore_index=True), crs="EPSG:4326")
    id_column = next(column for column in result.columns if column.lower() == "hybas_id")
    return result.drop_duplicates(subset=[id_column]).reset_index(drop=True)


def iter_usa_tiles(path: Path, layer: str, columns: list[str], usa_geometry):
    """Yield filtered small tiles without keeping a national layer in memory."""
    envelopes = [(-125.0, 24.0, -66.0, 50.0), (-180.0, 50.0, -129.0, 73.0), (-162.0, 18.0, -153.0, 24.0)]
    for min_x, min_y, max_x, max_y in envelopes:
        for x in np.arange(min_x, max_x, 5.0):
            for y in np.arange(min_y, max_y, 5.0):
                bounds = (float(x - 0.01), float(y - 0.01), float(min(x + 5.0, max_x) + 0.01), float(min(y + 5.0, max_y) + 0.01))
                tile = load_basinatlas(path, layer, columns=columns, bbox=bounds)
                if not tile.empty:
                    tile = tile.loc[tile.intersects(usa_geometry)].copy()
                print(f"Read tile {bounds}; retained {len(tile):,} catchments", flush=True)
                if not tile.empty:
                    yield tile
                    del tile
                    gc.collect()


def find_basinatlas_input() -> Path | None:
    """Find an extracted official BasinATLAS geodatabase placed in data/raw."""
    gdbs = sorted(path for path in RAW_DIR.rglob("*.gdb") if path.is_dir())
    if len(gdbs) == 1:
        return gdbs[0]
    shapefiles = sorted(RAW_DIR.rglob("*lev12*.shp"))
    if len(shapefiles) == 1:
        return shapefiles[0]
    if len(gdbs) > 1 or len(shapefiles) > 1:
        choices = [str(path) for path in [*gdbs, *shapefiles]]
        raise ValueError(f"More than one BasinATLAS source was found. Use --input explicitly. Candidates: {choices}")
    return None


def load_us_boundary(path: Path) -> gpd.GeoDataFrame:
    boundary = gpd.read_file(path)
    state_column = resolve_column(boundary, "STUSPS")
    return boundary.loc[boundary[state_column].isin(US_STATES_AND_DC), ["geometry"]]


def validate(frame: gpd.GeoDataFrame, geometry_repaired: int = 0, geometry_dropped: int = 0) -> dict[str, int]:
    sentinel_columns = ["sub_area_km2", "up_area_km2", "elevation_mean_m_asl_candidate", "natural_discharge_m3_s_candidate", "landcover_class_glc2000_candidate"]
    for column in sentinel_columns:
        frame[column] = pd.to_numeric(frame[column], errors="coerce").replace(-9999, np.nan)

    issues = {
        "geometry_repaired": geometry_repaired,
        "geometry_dropped": geometry_dropped,
        "missing_geometry": int(frame.geometry.isna().sum() + (~frame.geometry.is_valid).sum()),
        "nonpositive_sub_area": int((frame["sub_area_km2"] <= 0).sum()),
        "upstream_area_less_than_sub_area": int((frame["up_area_km2"] < frame["sub_area_km2"]).sum()),
        "negative_natural_discharge": int((frame["natural_discharge_m3_s_candidate"] < 0).sum()),
        "missing_candidate_elevation": int(frame["elevation_mean_m_asl_candidate"].isna().sum()),
        "missing_candidate_discharge": int(frame["natural_discharge_m3_s_candidate"].isna().sum()),
    }
    if issues["missing_geometry"]:
        raise ValueError("Invalid or missing basin geometry found; do not create a point-in-polygon dataset.")
    return issues


def write_spatial_tiles(frame: gpd.GeoDataFrame) -> dict[str, int | float]:
    """Write small, overlapping-by-bounds tiles for memory-safe point lookups.

    Each polygon is copied into every 5-degree cell its bounding box intersects.
    This guarantees that the correct polygon is present in the cell containing
    a user's point, including when the polygon crosses a cell boundary.
    """
    if frame.crs is None or frame.crs.to_epsg() != 4326:
        raise ValueError("Spatial tiles require EPSG:4326 geometries.")

    TILES_DIR.mkdir(parents=True, exist_ok=True)
    for stale_tile in TILES_DIR.glob("x*_y*.parquet"):
        stale_tile.unlink()

    min_x, min_y, max_x, max_y = frame.total_bounds
    first_x = int(np.floor((min_x + 180) / TILE_SIZE_DEGREES))
    last_x = int(np.floor((max_x + 180) / TILE_SIZE_DEGREES))
    first_y = int(np.floor((min_y + 90) / TILE_SIZE_DEGREES))
    last_y = int(np.floor((max_y + 90) / TILE_SIZE_DEGREES))
    spatial_index = frame.sindex
    tile_count = 0
    duplicated_rows = 0

    from shapely.geometry import box

    for tile_x in range(first_x, last_x + 1):
        left = tile_x * TILE_SIZE_DEGREES - 180
        right = left + TILE_SIZE_DEGREES
        for tile_y in range(first_y, last_y + 1):
            bottom = tile_y * TILE_SIZE_DEGREES - 90
            top = bottom + TILE_SIZE_DEGREES
            cell = box(left, bottom, right, top)
            indexes = spatial_index.query(cell, predicate="intersects")
            if not len(indexes):
                continue
            tile = frame.iloc[indexes].copy()
            tile = tile.loc[tile.geometry.intersects(cell)]
            if tile.empty:
                continue
            tile.to_parquet(TILES_DIR / f"x{tile_x}_y{tile_y}.parquet", index=False)
            tile_count += 1
            duplicated_rows += len(tile)

    return {
        "tile_size_degrees": TILE_SIZE_DEGREES,
        "tile_count": tile_count,
        "rows_with_tile_overlap": duplicated_rows,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, help="BasinATLAS geodatabase or Level-12 shapefile. If omitted, auto-detect under data/raw/.")
    parser.add_argument("--layer", default="BasinATLAS_v10_lev12", help="Layer name when input is a file geodatabase.")
    parser.add_argument("--usa-boundary", type=Path, help="Optional U.S. state boundary dataset. Defaults to official Census TIGER/Line states.")
    parser.add_argument("--extent", nargs=4, type=float, metavar=("MIN_LON", "MIN_LAT", "MAX_LON", "MAX_LAT"), help="Build a real regional pilot from this EPSG:4326 bounding box.")
    parser.add_argument("--tiles-only", action="store_true", help="Build spatial tile files from the existing data/processed/basins.parquet file.")
    args = parser.parse_args()

    if args.tiles_only:
        if not OUTPUT_PATH.exists():
            parser.error(f"Processed source is missing: {OUTPUT_PATH}")
        frame = gpd.read_parquet(OUTPUT_PATH)
        tile_metadata = write_spatial_tiles(frame)
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8")) if METADATA_PATH.exists() else {}
        metadata["spatial_tiles"] = tile_metadata
        METADATA_PATH.write_text(json.dumps(metadata, indent=2), encoding="utf-8")
        print(f"Wrote {tile_metadata['tile_count']} spatial tiles to {TILES_DIR}")
        return

    source_path = args.input or find_basinatlas_input()
    if source_path is None:
        parser.error("No extracted BasinATLAS source found. Place BasinATLAS_v10.gdb under data/raw/ or pass --input.")

    boundary_path = args.usa_boundary or download(US_BOUNDARY_URL, RAW_DIR / "cb_2023_us_state_500k.zip")
    print(f"Using BasinATLAS source: {source_path}")
    schema_sample = load_basinatlas(source_path, args.layer, rows=1)
    fields = {source: resolve_column(schema_sample, source) for source in SOURCE_FIELDS}
    usa = load_us_boundary(boundary_path).to_crs("EPSG:4326")
    usa_geometry = usa.union_all()
    if args.extent:
        tile = load_basinatlas(source_path, args.layer, columns=[*fields.values()], bbox=tuple(args.extent))
        selected = tile.to_crs("EPSG:4326")[[*fields.values(), "geometry"]].rename(columns={actual: SOURCE_FIELDS[source] for source, actual in fields.items()})
        selected = selected.loc[selected.intersects(usa_geometry)].copy()
        invalid = selected.geometry.isna() | ~selected.geometry.is_valid
        repaired = int(invalid.sum())
        if repaired:
            selected["geometry"] = selected.geometry.make_valid()
        selected = selected.loc[selected.geometry.notna() & ~selected.geometry.is_empty & selected.geometry.is_valid].copy()
        issues = validate(selected, geometry_repaired=repaired)
        if selected.empty:
            raise ValueError("The requested regional extent contains no valid U.S. BasinATLAS catchments.")
        PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
        selected.to_parquet(OUTPUT_PATH, index=False)
        tile_metadata = write_spatial_tiles(selected)
        METADATA_PATH.write_text(json.dumps({"crs": "EPSG:4326", "source": "HydroATLAS BasinATLAS v1.0, level 12", "geographic_filter": f"Regional pilot extent: {args.extent}", "rows": len(selected), "fields": list(selected.columns), "validation": issues, "spatial_tiles": tile_metadata, "model_readiness": "Real official BasinATLAS regional pilot for local prototype use."}, indent=2), encoding="utf-8")
        print(f"Wrote {len(selected):,} regional-pilot basins to {OUTPUT_PATH}")
        return
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    # A per-process temporary name avoids a stale OneDrive/indexer lock from a
    # prior interrupted build on Windows.
    temporary_output = OUTPUT_PATH.with_name(f".basins-{os.getpid()}.building.parquet")
    seen_ids: set[object] = set()
    totals = {"geometry_repaired": 0, "geometry_dropped": 0, "missing_geometry": 0, "nonpositive_sub_area": 0, "upstream_area_less_than_sub_area": 0, "negative_natural_discharge": 0, "missing_candidate_elevation": 0, "missing_candidate_discharge": 0}
    rows_written = 0
    writer = None
    try:
        for index, tile in enumerate(iter_usa_tiles(source_path, args.layer, columns=[*fields.values()], usa_geometry=usa_geometry)):
            if tile.crs is None:
                raise ValueError("BasinATLAS input has no CRS. Refuse to run because point lookup coordinates would be ambiguous.")
            selected = tile.to_crs("EPSG:4326")[[*fields.values(), "geometry"]].rename(columns={actual: SOURCE_FIELDS[source] for source, actual in fields.items()})
            selected = selected.drop_duplicates(subset=["hybas_id"])
            selected = selected.loc[~selected["hybas_id"].isin(seen_ids)].copy()
            if selected.empty:
                continue
            invalid_before = selected.geometry.isna() | ~selected.geometry.is_valid
            repaired = int(invalid_before.sum())
            if repaired:
                selected["geometry"] = selected.geometry.make_valid()
            valid_after = selected.geometry.notna() & ~selected.geometry.is_empty & selected.geometry.is_valid
            dropped = int((~valid_after).sum())
            selected = selected.loc[valid_after].copy()
            issues = validate(selected, geometry_repaired=repaired, geometry_dropped=dropped)
            for key, value in issues.items():
                totals[key] += value
            if selected.empty:
                continue
            seen_ids.update(selected["hybas_id"].tolist())
            tile_output = PROCESSED_DIR / f".basins-part-{index}.parquet"
            selected.to_parquet(tile_output, index=False)
            table = pq.read_table(tile_output)
            if writer is None:
                writer = pq.ParquetWriter(temporary_output, table.schema)
            writer.write_table(table)
            tile_output.unlink(missing_ok=True)
            rows_written += len(selected)
            print(f"Wrote {rows_written:,} unique U.S. catchments so far", flush=True)
            del selected, table
            gc.collect()
    finally:
        if writer is not None:
            writer.close()
    if not rows_written:
        raise ValueError("No valid U.S. BasinATLAS catchments were written.")
    temporary_output.replace(OUTPUT_PATH)
    tile_frame = gpd.read_parquet(OUTPUT_PATH)
    tile_metadata = write_spatial_tiles(tile_frame)
    METADATA_PATH.write_text(json.dumps({
        "crs": "EPSG:4326",
        "source": "HydroATLAS BasinATLAS v1.0, level 12",
        "geographic_filter": "Intersects the 50 U.S. states or District of Columbia; full watershed geometries retained.",
        "rows": rows_written,
        "fields": [*SOURCE_FIELDS.values(), "geometry"],
        "validation": totals,
        "spatial_tiles": tile_metadata,
        "model_readiness": "Operational prototype: API uses upstream area, mean sub-basin elevation, natural annual discharge, and an approximate GLC2000 land-cover crosswalk. These may differ from the original training variables.",
    }, indent=2), encoding="utf-8")
    print(f"Wrote {rows_written:,} basins to {OUTPUT_PATH}")
    print(f"Wrote validation metadata to {METADATA_PATH}")


if __name__ == "__main__":
    main()
