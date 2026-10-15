# DOC Predictor

A React interface and local Python API for estimating dissolved organic carbon (DOC) from a USA location and date.

## Local setup

Open two terminals in this folder.

```bash
# Terminal 1: prediction API
python -m pip install -r api\requirements.txt
uvicorn api.app:app --reload --host 127.0.0.1 --port 8000
```

```bash
# Terminal 2: website
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`).

## BasinATLAS preparation

Download **Global BasinATLAS in geodatabase format (2.51 GB)** from the official [HydroATLAS download page](https://www.hydrosheds.org/hydroatlas), then extract its `BasinATLAS_v10.gdb` directory into `data/raw/` in this repository. The script auto-detects that directory.

```bash
python scripts\build_hydroatlas_dataset.py
```

If the extracted geodatabase is stored elsewhere, run `python scripts\build_hydroatlas_dataset.py --input <path-to-BasinATLAS_v10.gdb>` instead.

The resulting `data/processed/basins.parquet` is used only by the local API and must not be committed or served by the frontend.

## Prediction method and limitations

The app uses the supplied median imputer, scaler, one-hot encoder, and `simple_stacked_model.pkl`. A place name is geocoded with OpenStreetMap Nominatim; coordinates can also be entered as `latitude, longitude`.

For the operational prototype, it looks up the Level-12 HydroBASINS catchment and substitutes its upstream area, mean sub-basin elevation, natural annual discharge, and an approximate GLC2000 land-cover crosswalk. These values may differ from the original research variables. Predictions are model estimates, not measurements, and no calibrated uncertainty interval is available.
