"""Water-source risk tool: a small web app that serves the trained Model 1
(water_source_risk_model.joblib) from the SIIS5106 notebook.

The decision logic mirrors assess_water_source() in the notebook exactly:
  1. source type in the "presumed unsafe" list  -> Presumed unsafe - no test needed
  2. otherwise probability >= 0.5               -> Test first (high priority)
  3. otherwise                                  -> Test on routine schedule
"""
import os
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from flask import Flask, abort, jsonify, render_template, request, send_from_directory

BASE = Path(__file__).parent

# Works with the folder layout (model/, templates/, static/) or with every file in one folder.
# The model file may also be called "download" if the browser saved it without its name.
_CANDIDATES = [os.environ.get("MODEL_PATH"), BASE / "model" / "water_source_risk_model.joblib",
               BASE / "water_source_risk_model.joblib", BASE / "model" / "download", BASE / "download"]
MODEL_PATH = next((Path(c) for c in _CANDIDATES if c and Path(c).is_file()), BASE / "model" / "water_source_risk_model.joblib")
TEMPLATE_DIR = BASE / "templates" if (BASE / "templates" / "index.html").is_file() else BASE
STATIC_DIR = BASE / "static" if (BASE / "static" / "style.css").is_file() else BASE
STATIC_FILES = {"style.css", "app.js"}

ACTIONS = {
    "Presumed unsafe - no test needed": "Chlorinate or advise boiling now; plan protection/upgrade of the source; promote safe storage.",
    "Test first (high priority)": "Test within the week; inspect apron, drainage and nearby latrines; advise household treatment until results are back.",
    "Test on routine schedule": "Keep on routine testing; re-test after heavy rain; promote safe storage (home water is often contaminated).",
}

app = Flask(__name__, template_folder=str(TEMPLATE_DIR), static_folder=None)


def serve_static(filename):
    # Only the page's own CSS and JS are served, never the model or source files.
    if filename not in STATIC_FILES:
        abort(404)
    return send_from_directory(STATIC_DIR, filename)


app.add_url_rule("/static/<path:filename>", endpoint="static", view_func=serve_static)

try:
    BUNDLE = joblib.load(MODEL_PATH)
    MODEL_ERROR = None
except Exception as exc:  # the page still loads and explains what is missing
    BUNDLE, MODEL_ERROR = None, f"{type(exc).__name__}: {exc}"


def _prepare(df: pd.DataFrame) -> pd.DataFrame:
    """Add any missing input columns as NaN (the model's imputers fill them) and coerce numbers."""
    cols = BUNDLE["numeric"] + BUNDLE["categorical"]
    df = df.copy()
    for c in cols:
        if c not in df:
            df[c] = np.nan
    for c in BUNDLE["numeric"]:
        df[c] = pd.to_numeric(df[c], errors="coerce")
    for c in BUNDLE["categorical"]:
        df[c] = df[c].where(df[c].notna() & (df[c].astype(str).str.strip() != ""), np.nan)
    return df[cols]


def _decide(source, prob):
    if source in BUNDLE["presumed_unsafe_sources"]:
        return "Presumed unsafe - no test needed"
    if prob >= 0.5:
        return "Test first (high priority)"
    return "Test on routine schedule"


def assess(info: dict) -> dict:
    row = _prepare(pd.DataFrame([info]))
    prob = float(BUNDLE["model"].predict_proba(row)[0, 1])
    decision = _decide(info.get("source"), prob)
    return {"probability_contaminated": round(prob, 2), "decision": decision, "action": ACTIONS[decision]}


def _categories():
    """Read the category options the model was trained on, so the form always matches the model."""
    try:
        prep = BUNDLE["model"].named_steps["prep"]
        enc = prep.named_transformers_["cat"].named_steps["onehot"]
        return {c: [str(v) for v in cats if str(v) not in ("Unknown", "Other", "nan")]
                for c, cats in zip(BUNDLE["categorical"], enc.categories_)}
    except Exception:
        return {}


@app.get("/")
def index():
    info = None
    if BUNDLE is not None:
        info = {
            "model_name": BUNDLE.get("model_name", "Logistic regression"),
            "auc": BUNDLE.get("auc_unseen_villages"),
            "trained_on": BUNDLE.get("trained_on", ""),
            "presumed_unsafe": BUNDLE["presumed_unsafe_sources"],
            "categories": _categories(),
            "numeric": BUNDLE["numeric"],
        }
    return render_template("index.html", info=info, model_error=MODEL_ERROR)


@app.get("/health")
def health():
    return jsonify(status="ok" if BUNDLE is not None else "model_missing", error=MODEL_ERROR)


@app.post("/api/assess")
def api_assess():
    if BUNDLE is None:
        return jsonify(error="Model file not loaded: " + str(MODEL_ERROR)), 503
    data = request.get_json(silent=True) or {}
    allowed = set(BUNDLE["numeric"] + BUNDLE["categorical"])
    info = {k: v for k, v in data.items() if k in allowed and v not in (None, "")}
    if not info.get("source"):
        return jsonify(error="Choose a source type."), 400
    return jsonify(assess(info))


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=False)
