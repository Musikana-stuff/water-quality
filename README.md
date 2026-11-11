# Water Source Risk Tool

A small website that runs the trained **Model 1** from the notebook *Water-Quality Monitoring for Rural Communities*
(logistic regression, ROC AUC 0.83 on unseen villages, trained on 1,308 rural households from Zimbabwe MICS 2019).

It does exactly what `assess_water_source()` does in the notebook:

1. Source types that were at least 85% contaminated are **presumed unsafe** (no test needed).
2. Any other source with a 50%+ chance of contamination is **tested first**.
3. Everything else goes on **routine testing**.


## Deploy on Render (about 15 minutes)

### 1. Export the model from Colab
1. Open the notebook in Colab and run all cells up to and including section 8 (the working model).
2. Add a new cell at the end, paste in `export_model_from_colab.py`, and run it.
3. It downloads `water_source_risk_model.joblib` and prints the versions Colab used.

### 2. Match the versions (important)
A scikit-learn model only loads on the **same scikit-learn version** it was trained with.
- In `requirements.txt`, set `scikit-learn==` to the version the export cell printed.
- In `render.yaml`, set `PYTHON_VERSION` to the Python version it printed.

### 3. Put the app on GitHub
1. Copy `water_source_risk_model.joblib` into the `model/` folder.
2. Create a new GitHub repository and upload everything in this folder (keep the folder structure).

### 4. Deploy on Render
1. Sign in at render.com and choose **New > Blueprint**.
2. Connect your GitHub account and pick the repository. Render reads `render.yaml` and sets everything up.
3. Click **Apply**. When the build finishes, open the `.onrender.com` link.
4. Check `/health` on your link: it should say `"status": "ok"`.

Free Render services go to sleep after a period of inactivity, so the first visit after a while can take up to a minute.
Open the link a minute before you present.

## Run it on your own computer (optional)
```
pip install -r requirements.txt
python app.py
```
Then open http://localhost:5000

## Files
| File | What it does |
|---|---|
| `app.py` | The web server and the model logic |
| `templates/index.html`, `static/` | The web page |
| `model/` | Put the trained model file here |
| `render.yaml`, `requirements.txt` | Render deployment settings |
| `export_model_from_colab.py` | Colab cell that downloads the model and prints versions |

## Data and ethics
The model file contains the trained model only, no household records. MICS data is used under the MICS terms of use
and is not redistributed. Sources: ZIMSTAT and UNICEF (2019) *Zimbabwe MICS 2019*; UNICEF MICS Programme (2025)
geospatial covariates. A low score means "keep on routine testing", not "safe to drink".
