"""Local DOC prediction API backed by a processed USA BasinATLAS dataset.

The BasinATLAS substitutions are returned with each prediction so the UI can
disclose that they are approximate matches to the research inputs.
"""

from __future__ import annotations

import pickle
import logging
import json
import math
import os
import urllib.error
import urllib.request
from datetime import date
from functools import lru_cache
from pathlib import Path
from typing import Literal

import geopandas as gpd
import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from shapely.geometry import Point
from shapely.geometry import mapping

ROOT = Path(__file__).resolve().parent
MODELS = ROOT / "models"
BASINS_PATH = ROOT.parent / "data" / "processed" / "basins.parquet"
TILED_BASINS_PATH = ROOT.parent / "data" / "processed" / "basins_tiles"
MOCK_BASINS_PATH = ROOT.parent / "data" / "mock" / "basins.geojson"
TILE_SIZE_DEGREES = 5.0
MAP_SEARCH_RADIUS_DEGREES = 0.16
MAP_GEOMETRY_SIMPLIFY_DEGREES = 0.002
MAX_MAP_CATCHMENTS = 40
NUMERIC_COLUMNS = ["Lat", "Lon", "area", "altitude", "dis_mean", "doy", "month_sin", "month_cos"]
ENCODED_COLUMNS = ["dom_land_cover_Mixed", "dom_land_cover_Needleleaf", "dom_land_cover_unknown"]
MODEL_COLUMNS = [*NUMERIC_COLUMNS, *ENCODED_COLUMNS]
REQUIRED_BASIN_COLUMNS = {
    "hybas_id", "up_area_km2", "elevation_mean_m_asl_candidate",
    "natural_discharge_m3_s_candidate", "landcover_class_glc2000_candidate", "geometry",
}


def load_local_environment() -> None:
    """Load local development secrets without adding a dependency or committing them."""
    env_file = ROOT.parent / ".env"
    if not env_file.exists():
        return
    for line in env_file.read_text(encoding="utf-8").splitlines():
        if "=" not in line or line.lstrip().startswith("#"):
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip().strip('"').strip("'"))


load_local_environment()

app = FastAPI(title="DOC prediction API", version="0.2.0")
logger = logging.getLogger("doc_predictor")
allowed_origins = [origin.strip() for origin in os.getenv(
    "CORS_ALLOW_ORIGINS",
    "https://akshaysurabhi30-dotcom.github.io,http://localhost:5173,http://127.0.0.1:5173",
).split(",") if origin.strip()]
app.add_middleware(CORSMiddleware, allow_origins=allowed_origins, allow_methods=["*"], allow_headers=["*"])
data_source_mode: Literal["auto", "mock", "real"] = "auto"


class PredictionRequest(BaseModel):
    latitude: float = Field(ge=-90, le=90)
    longitude: float = Field(ge=-180, le=180)
    date: date


class DataSourceSettings(BaseModel):
    mode: Literal["auto", "mock", "real"]


def load_pickle(name: str):
    with (MODELS / name).open("rb") as file:
        return pickle.load(file)


# Supplied training-time preprocessing and prediction artifacts.
imputer = load_pickle("simple_stack_model_median_imputer.pkl")
scaler = load_pickle("simple_stack_model_Scalar.pkl")
encoder = load_pickle("simple_stack_model_Ohe.pkl")
model = load_pickle("simple_stacked_model.pkl")


@lru_cache(maxsize=3)
def load_basins(mode: Literal["auto", "mock", "real"] = "auto") -> gpd.GeoDataFrame:
    real_ready = real_basin_data_ready()
    is_mock = mode == "mock" or (mode == "auto" and not real_ready)
    if mode == "real" and not real_ready:
        raise FileNotFoundError("Real BasinATLAS data has not been built yet. Run scripts/build_hydroatlas_dataset.py, then select Real BasinATLAS again.")
    if is_mock and not MOCK_BASINS_PATH.exists():
        raise FileNotFoundError("The USA BasinATLAS dataset has not been built. Run scripts/build_hydroatlas_dataset.py after downloading and extracting BasinATLAS.")
    basins = gpd.read_file(MOCK_BASINS_PATH) if is_mock else gpd.read_parquet(BASINS_PATH)
    missing = REQUIRED_BASIN_COLUMNS.difference(basins.columns)
    if missing:
        raise ValueError(f"Processed basin dataset is missing required columns: {sorted(missing)}")
    if basins.crs is None or basins.crs.to_epsg() != 4326:
        raise ValueError("Processed basin geometries must use EPSG:4326.")
    basins.attrs["data_source"] = "mock" if is_mock else "BasinATLAS"
    return basins


def real_basin_data_ready() -> bool:
    if TILED_BASINS_PATH.is_dir() and next(TILED_BASINS_PATH.glob("x*_y*.parquet"), None):
        return True
    return BASINS_PATH.exists()


def data_source_for_mode(mode: Literal["auto", "mock", "real"]) -> str:
    if mode == "mock" or (mode == "auto" and not real_basin_data_ready()):
        return "mock"
    return "BasinATLAS"


def tile_key(longitude: float, latitude: float) -> tuple[int, int]:
    return (
        math.floor((longitude + 180) / TILE_SIZE_DEGREES),
        math.floor((latitude + 90) / TILE_SIZE_DEGREES),
    )


@lru_cache(maxsize=6)
def load_basin_tile(tile_x: int, tile_y: int) -> gpd.GeoDataFrame:
    path = TILED_BASINS_PATH / f"x{tile_x}_y{tile_y}.parquet"
    if not path.exists():
        return gpd.GeoDataFrame(columns=list(REQUIRED_BASIN_COLUMNS), geometry="geometry", crs="EPSG:4326")
    basins = gpd.read_parquet(path)
    missing = REQUIRED_BASIN_COLUMNS.difference(basins.columns)
    if missing:
        raise ValueError(f"Spatial tile is missing required columns: {sorted(missing)}")
    if basins.crs is None or basins.crs.to_epsg() != 4326:
        raise ValueError("Processed basin geometries must use EPSG:4326.")
    basins.attrs["data_source"] = "BasinATLAS"
    return basins


def load_tiles_for_bounds(bounds: tuple[float, float, float, float]) -> gpd.GeoDataFrame:
    min_x, min_y, max_x, max_y = bounds
    first_x, first_y = tile_key(min_x, min_y)
    last_x, last_y = tile_key(max_x, max_y)
    tiles = [
        load_basin_tile(tile_x, tile_y)
        for tile_x in range(first_x, last_x + 1)
        for tile_y in range(first_y, last_y + 1)
    ]
    tiles = [tile for tile in tiles if not tile.empty]
    if not tiles:
        return gpd.GeoDataFrame(columns=list(REQUIRED_BASIN_COLUMNS), geometry="geometry", crs="EPSG:4326")
    basins = gpd.GeoDataFrame(pd.concat(tiles, ignore_index=True), crs="EPSG:4326")
    basins = basins.drop_duplicates(subset=["hybas_id"]).reset_index(drop=True)
    basins.attrs["data_source"] = "BasinATLAS"
    return basins


def basin_for_point(latitude: float, longitude: float) -> pd.Series:
    point = Point(longitude, latitude)
    if data_source_mode == "mock":
        basins = load_basins("mock")
    elif real_basin_data_ready() and TILED_BASINS_PATH.is_dir() and next(TILED_BASINS_PATH.glob("x*_y*.parquet"), None):
        basins = load_basin_tile(*tile_key(longitude, latitude))
    else:
        # Backward-compatible local path for users who have only built the legacy file.
        basins = load_basins(data_source_mode)
    candidate_indexes = basins.sindex.query(point, predicate="intersects")
    matches = basins.iloc[candidate_indexes].loc[lambda rows: rows.geometry.covers(point)]
    if matches.empty:
        raise LookupError("No USA BasinATLAS Level-12 catchment contains that location.")
    return matches.sort_values("hybas_id").iloc[0]


def approximate_land_cover(glc2000_class: object) -> str:
    """Map GLC2000 forest classes to trained labels; all other classes are unknown."""
    try:
        code = int(float(glc2000_class))
    except (TypeError, ValueError):
        return "unknown"
    # GLC2000: 1–3 broadleaf, 4–5 needleleaf, 6 mixed-leaf tree cover.
    if code in {1, 2, 3}:
        return "Broadleaf"
    if code in {4, 5}:
        return "Needleleaf"
    if code == 6:
        return "Mixed"
    return "unknown"


def json_value(value: object) -> float | int | str | None:
    """Convert numpy/pandas values to JSON-safe values without hiding NaNs."""
    if pd.isna(value):
        return None
    if isinstance(value, np.generic):
        value = value.item()
    return value


class GuidanceError(Exception):
    """Raised when the optional OpenAI guidance service cannot respond."""


def ai_guidance(doc_mg_l: float, basin_id: str, land_cover: str, latitude: float, longitude: float) -> dict[str, object]:
    """Use GPT-5.6 Sol for short, non-medical community guidance."""
    key = os.getenv("OPENAI_API_KEY")
    if not key or key == "your_openai_api_key_here":
        raise GuidanceError("OpenAI guidance is not configured on this public API. The DOC estimate is still available.")
    in_ohio_pilot = 38.3 <= latitude <= 42.4 and -85.1 <= longitude <= -80.4
    resources = ([
        "Ohio EPA Certified Drinking Water Laboratory List: 614-644-2752 or DWLabCert@epa.ohio.gov.",
        "U.S. EPA Safe Drinking Water Hotline: 800-426-4791.",
    ] if in_ohio_pilot else [
        "U.S. EPA Safe Drinking Water Hotline: 800-426-4791.",
        "Ask your local water utility for its current water-quality report.",
    ])
    doc_summary = (
        "This estimate is in the app's lower DOC range. It does not show a DOC-specific concern."
        if doc_mg_l < 3 else
        "This estimate is in the app's moderate DOC range. Take normal care near the water."
        if doc_mg_l < 8 else
        "This estimate is in the app's higher DOC range. Avoid contact with water that looks unusual."
    )
    prompt = f"""Write friendly public guidance for a watershed app.
DOC estimate: {doc_mg_l:.2f} mg/L.
Catchment: {basin_id}.
Land cover: {land_cover}.

Return only valid JSON with these keys: pets, people, actions, resources, note.
Start both Pets and People with this exact DOC summary: {doc_summary}
Pets: one short paragraph. provide helpful info about water quality based entirely od doc reading ignore other factors.then Tell users to keep pets out of murky, smelly, or discolored water.
People: one short paragraph. provide helpful info about water quality based entirely od doc reading ignore other factors.then Say untreated surface water is not drinking water. Say not to swim after a spill or when water looks unusual.
Actions: exactly three short, practical actions. Include keeping pesticide, fertilizer, pet waste, and litter away from water and storm drains. Do not give vague planning advice.
Resources: use exactly these two items and do not invent a laboratory name or contact: {json.dumps(resources)}.
Note: one short sentence. State that direct testing is needed for drinking or swimming safety decisions.
Use clear everyday words. Keep each sentence under 20 words. Do not say the water is safe or unsafe. Do not diagnose health risks."""
    guidance_schema = {
        "type": "object",
        "properties": {
            "pets": {"type": "string"},
            "people": {"type": "string"},
            "actions": {"type": "array", "items": {"type": "string"}, "minItems": 3, "maxItems": 3},
            "resources": {"type": "array", "items": {"type": "string"}, "minItems": 2, "maxItems": 2},
            "note": {"type": "string"},
        },
        "required": ["pets", "people", "actions", "resources", "note"],
        "additionalProperties": False,
    }
    payload = {
        "model": "gpt-5.6-sol",
        "input": prompt,
        "reasoning": {"effort": "none"},
        "max_output_tokens": 800,
        "text": {"format": {"type": "json_schema", "name": "watershed_guidance", "strict": True, "schema": guidance_schema}},
        "store": False,
    }
    request = urllib.request.Request("https://api.openai.com/v1/responses", data=json.dumps(payload).encode("utf-8"), headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"}, method="POST")
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = json.loads(response.read().decode("utf-8"))
        text = "".join(content.get("text", "") for item in body.get("output", []) for content in item.get("content", []) if content.get("type") == "output_text")
        guidance = json.loads(text)
        if not all(field in guidance for field in ("pets", "people", "actions", "resources", "note")):
            raise ValueError("Model response was incomplete")
        return {"source": "openai", **guidance}
    except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError, ValueError, json.JSONDecodeError) as error:
        logger.warning("OpenAI guidance unavailable: %s", error)
        raise GuidanceError("OpenAI guidance is not available. Check the API key and try again.") from error


@app.get("/api/health")
def health():
    return {"status": "ok", "basin_dataset_ready": real_basin_data_ready(), "data_source": data_source_for_mode(data_source_mode), "mode": data_source_mode, "model": "simple_stacked_model.pkl"}


@app.get("/api/settings/data-source")
def get_data_source_settings():
    return {"mode": data_source_mode, "real_data_ready": real_basin_data_ready(), "mock_data_ready": MOCK_BASINS_PATH.exists()}


@app.put("/api/settings/data-source")
def set_data_source_settings(settings: DataSourceSettings):
    global data_source_mode
    data_source_mode = settings.mode
    load_basins.cache_clear()
    load_basin_tile.cache_clear()
    return get_data_source_settings()


@app.get("/api/catchments")
def catchments(latitude: float = Query(ge=-90, le=90), longitude: float = Query(ge=-180, le=180)):
    """Return the selected and nearby catchment polygons for map display."""
    try:
        selected = basin_for_point(latitude, longitude)
        point = Point(longitude, latitude)
        if data_source_for_mode(data_source_mode) == "mock":
            basins = load_basins("mock")
        elif TILED_BASINS_PATH.is_dir() and next(TILED_BASINS_PATH.glob("x*_y*.parquet"), None):
            search_window = point.buffer(MAP_SEARCH_RADIUS_DEGREES)
            basins = load_tiles_for_bounds(search_window.bounds)
        else:
            basins = load_basins(data_source_mode)
    except (FileNotFoundError, ValueError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    # Read only regional tiles, then limit and simplify map-only geometry.
    search_window = point.buffer(MAP_SEARCH_RADIUS_DEGREES)
    nearby_indexes = basins.sindex.query(search_window, predicate="intersects")
    nearby = basins.iloc[nearby_indexes].copy()
    selected_id = str(selected["hybas_id"])
    if selected_id not in nearby["hybas_id"].astype(str).values:
        selected_frame = gpd.GeoDataFrame(
            [selected.to_dict()], geometry="geometry", crs="EPSG:4326"
        )
        nearby = gpd.GeoDataFrame(
            pd.concat([nearby, selected_frame], ignore_index=True),
            geometry="geometry",
            crs="EPSG:4326",
        )
    nearby["_selected"] = nearby["hybas_id"].astype(str) == selected_id
    # Use a U.S. equal-area CRS for meaningful kilometer distances. Keep the
    # original WGS84 geometry for the GeoJSON response sent to the map.
    projected_point = gpd.GeoSeries([point], crs="EPSG:4326").to_crs("EPSG:5070").iloc[0]
    nearby_projected = nearby.to_crs("EPSG:5070")
    nearby["_distance"] = nearby_projected.geometry.distance(projected_point)
    nearby = nearby.sort_values(["_selected", "_distance"], ascending=[False, True]).head(MAX_MAP_CATCHMENTS)
    features = [{
        "type": "Feature",
        "properties": {
            "hybas_id": str(row["hybas_id"]),
            "selected": str(row["hybas_id"]) == str(selected["hybas_id"]),
            # Representative points always fall inside their polygon, unlike a
            # geometric centroid for concave catchments.
            "center": {"latitude": round(row.geometry.representative_point().y, 6), "longitude": round(row.geometry.representative_point().x, 6)},
            "distance_km": round(float(row["_distance"]) / 1000.0, 2),
        },
        "geometry": mapping(row.geometry.simplify(MAP_GEOMETRY_SIMPLIFY_DEGREES, preserve_topology=True)),
    } for _, row in nearby.iterrows()]
    features.sort(key=lambda feature: (not feature["properties"]["selected"], feature["properties"]["distance_km"]))
    return {"type": "FeatureCollection", "features": features, "selected_basin_id": str(selected["hybas_id"]), "data_source": basins.attrs["data_source"]}


@app.post("/api/predict")
def predict(request: PredictionRequest):
    try:
        basin = basin_for_point(request.latitude, request.longitude)
        data_source = data_source_for_mode(data_source_mode)
    except (FileNotFoundError, ValueError) as error:
        raise HTTPException(status_code=503, detail=str(error)) from error
    except LookupError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    month = request.date.month
    land_cover = approximate_land_cover(basin["landcover_class_glc2000_candidate"])
    numeric = pd.DataFrame([{
        "Lat": request.latitude,
        "Lon": request.longitude,
        "area": basin["up_area_km2"],
        "altitude": basin["elevation_mean_m_asl_candidate"],
        "dis_mean": basin["natural_discharge_m3_s_candidate"],
        "doy": request.date.timetuple().tm_yday,
        "month_sin": np.sin(2 * np.pi * month / 12),
        "month_cos": np.cos(2 * np.pi * month / 12),
    }], columns=NUMERIC_COLUMNS).replace(-9999, np.nan)
    assert list(numeric.columns) == NUMERIC_COLUMNS
    assert numeric.shape == (1, 8)
    imputed = imputer.transform(numeric)
    assert imputed.shape == (1, 8)
    scaled = scaler.transform(imputed)
    assert scaled.shape == (1, 8)
    encoded_land_cover = encoder.transform(pd.DataFrame({"dom_land_cover": [land_cover]}))
    encoder_columns = list(encoder.get_feature_names_out())
    assert encoder_columns == ENCODED_COLUMNS
    assert encoded_land_cover.shape == (1, 3)
    raw_features = pd.concat([numeric.reset_index(drop=True), pd.DataFrame(encoded_land_cover, columns=ENCODED_COLUMNS)], axis=1)
    assert list(raw_features.columns) == MODEL_COLUMNS
    assert raw_features.shape == (1, 11)
    features = np.hstack([scaled, encoded_land_cover])
    assert features.shape == (1, 11)
    assert getattr(model, "n_features_in_", 11) == 11
    logger.info("Raw 11-feature row for HYBAS_ID %s: %s", basin["hybas_id"], raw_features.iloc[0].to_dict())
    prediction = max(0, float(np.expm1(float(model.predict(features)[0]))))
    assert np.isfinite(prediction), "Model prediction must be finite"
    rounded_prediction = round(prediction, 2)
    try:
        guidance = ai_guidance(rounded_prediction, str(basin["hybas_id"]), land_cover, request.latitude, request.longitude)
        guidance_error = None
    except GuidanceError as error:
        guidance = None
        guidance_error = str(error)

    return {
        "doc_mg_l": rounded_prediction,
        "unit": "mg/L",
        "basin_id": str(basin["hybas_id"]),
        "date": request.date.isoformat(),
        "inputs": {column: json_value(raw_features.iloc[0][column]) for column in MODEL_COLUMNS},
        "approximate_inputs": True,
        "data_source": data_source,
        "notice": "This is a model-based estimate using watershed-scale environmental attributes and is not a replacement for direct water-quality sampling.",
        "watershed": {
            "hybas_id": str(basin["hybas_id"]),
            "area_upstream_km2": round(float(basin["up_area_km2"]), 3),
            "elevation_mean_m_asl": round(float(basin["elevation_mean_m_asl_candidate"]), 2),
            "natural_discharge_m3_s": round(float(basin["natural_discharge_m3_s_candidate"]), 4),
            "glc2000_class": json_value(basin["landcover_class_glc2000_candidate"]),
            "mapped_land_cover": land_cover,
        },
        "uncertainty": None,
        "method_note": "Uses Level-12 BasinATLAS upstream area, mean sub-basin elevation, natural annual discharge, and an approximate GLC2000 forest-class crosswalk. These spatial inputs may differ from the original training variables; no calibrated prediction interval is available.",
        "guidance": guidance,
        "guidance_error": guidance_error,
    }
