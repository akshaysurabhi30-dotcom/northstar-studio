# DOC model prediction contract

## Evidence reviewed

- `C:\Users\nsura\OneDrive\Documents\preprocessing.py`
- `C:\Users\nsura\OneDrive\Documents\trainandtestsplit.py`
- `C:\Users\nsura\OneDrive\Documents\experiment_2.py`
- `api/models/simple_stack_model_median_imputer.pkl`
- `api/models/simple_stack_model_Scalar.pkl`
- `api/models/simple_stack_model_Ohe.pkl`
- `api/models/final_stacked_model.pkl`
- `data/dataset/Training data for DOC concentrations.csv`
- `data/dataset/Metadata summary.csv`

## Final model input vector

The final estimator consumes **11 transformed features** in the order below. This order is established by `trainandtestsplit.py`: it creates the numeric feature frame in the listed order, then concatenates its scaled values with the one-hot encoded land-cover columns. `experiment_2.py` trains with that resulting frame after dropping `DOC_mg/l`.

| # | Model Feature | Meaning | Expected Unit | Source | Transformation |
|---:|---|---|---|---|---|
| 1 | `Lat` | Sampling/location latitude | Decimal degrees; coordinate reference system is not established by the supplied code | `Training data for DOC concentrations.csv` | Median-impute if missing, then `StandardScaler` transform using the saved scaler |
| 2 | `Lon` | Sampling/location longitude | Decimal degrees; coordinate reference system is not established by the supplied code | `Training data for DOC concentrations.csv` | Median-impute if missing, then saved `StandardScaler` transform |
| 3 | `area` | Catchment area | **Not established by supplied code or data documentation** | `Metadata summary.csv` | Median-impute if missing, then saved `StandardScaler` transform |
| 4 | `altitude` | Site/catchment altitude | **Not established by supplied code or data documentation** | `Metadata summary.csv` | Median-impute if missing, then saved `StandardScaler` transform |
| 5 | `dis_mean` | Mean discharge | **Not established by supplied code or data documentation** | `Metadata summary.csv`; duplicate site-day values are averaged in `preprocessing.py` | Median-impute if missing, then saved `StandardScaler` transform |
| 6 | `doy` | Day of year from sample date | Day number; code describes a range of 1–365 | `date` in `Training data for DOC concentrations.csv` | `pd.to_datetime(date).dt.dayofyear`, then median-impute and saved `StandardScaler` transform |
| 7 | `month_sin` | Cyclic month position | Unitless | `month` in `Training data for DOC concentrations.csv` | `sin(2π × month / 12)`, then median-impute and saved `StandardScaler` transform |
| 8 | `month_cos` | Cyclic month position | Unitless | `month` in `Training data for DOC concentrations.csv` | `cos(2π × month / 12)`, then median-impute and saved `StandardScaler` transform |
| 9 | `dom_land_cover_Mixed` | Indicator for dominant land cover = `Mixed` | Binary 0/1 | `Metadata summary.csv` | One-hot encoding; `Broadleaf` is the dropped reference category |
| 10 | `dom_land_cover_Needleleaf` | Indicator for dominant land cover = `Needleleaf` | Binary 0/1 | `Metadata summary.csv` | One-hot encoding; `Broadleaf` is the dropped reference category |
| 11 | `dom_land_cover_unknown` | Indicator for a missing/unknown dominant land-cover value | Binary 0/1 | `Metadata summary.csv` | Missing values and string `-9999` are converted to `unknown`, then one-hot encoded |

The saved encoder establishes the full original category order as: `Broadleaf`, `Mixed`, `Needleleaf`, `unknown`. It was fit with `drop="first"`, producing exactly features 9–11.

## Target and output

- **Target column:** `DOC_mg/l`
- **Expected output unit:** mg/L, as encoded in the target column name.
- **Training target transform:** `experiment_2.py` applies `np.log1p(DOC_mg/l)` before fitting.
- **Required output inverse transform:** apply `np.expm1(model.predict(features))` to return DOC in mg/L.

## Required inference sequence

1. Accept or derive raw `Lat`, `Lon`, `area`, `altitude`, `dis_mean`, `date`, and `dom_land_cover`.
2. Derive `doy`, `month_sin`, and `month_cos` from the same calendar rules used in `preprocessing.py`.
3. Arrange numeric columns exactly as: `Lat`, `Lon`, `area`, `altitude`, `dis_mean`, `doy`, `month_sin`, `month_cos`.
4. Replace numeric sentinel `-9999` with missing values, then apply the saved `simple_stack_model_median_imputer.pkl`.
5. Apply the saved `simple_stack_model_Scalar.pkl` to the imputed numeric values.
6. Normalize `dom_land_cover`: fill missing values with `unknown`, trim whitespace, and convert string `-9999` to `unknown`.
7. Apply `simple_stack_model_Ohe.pkl`, producing `dom_land_cover_Mixed`, `dom_land_cover_Needleleaf`, and `dom_land_cover_unknown` in that order.
8. Horizontally concatenate the eight scaled numeric values followed by the three encoded categorical values.
9. Pass the 11-value vector to `final_stacked_model.pkl`.
10. Apply `np.expm1` to the model prediction and label the result as estimated DOC mg/L.

## Missing-data behavior

- Numeric `-9999` values are converted to missing values in `preprocessing.py`.
- The saved `SimpleImputer(strategy="median")` imputes numeric missing values before scaling.
- `dom_land_cover` missing values and string `-9999` become `unknown`.
- The saved `OneHotEncoder` has `handle_unknown="error"`. A new land-cover label outside the four trained categories will raise an error; it must not be silently mapped to another category.

## Items that cannot be established from the supplied materials

1. The physical units for `area`, `altitude`, and `dis_mean` are not documented in the supplied code or CSV headers. They must be confirmed before substituting HydroATLAS or any other live data source.
2. The coordinate reference system/datum for `Lat` and `Lon` is not stated in the supplied materials.
3. The provided training code does not contain a standalone production inference script. The sequence above is reconstructed from its preprocessing, saved preprocessing objects, and training code.
4. The code says `doy` is 1–365, but does not specify an explicit leap-day policy. A production service must preserve the original behavior or receive confirmation of how day 366 should be handled.
5. No source-to-HydroATLAS field mapping is provided. Do not substitute HydroATLAS fields for `area`, `altitude`, `dis_mean`, or `dom_land_cover` until their units and semantic equivalence are confirmed.
