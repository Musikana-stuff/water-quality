# Paste this into a NEW cell at the end of your Colab notebook (after section 8 has run)
# and run it. It downloads the trained model and prints the versions to use on Render.
import sys, sklearn, numpy, pandas, joblib
from google.colab import files

print("Put these in requirements.txt / render.yaml:")
print(f"  PYTHON_VERSION = {sys.version.split()[0]}")
print(f"  scikit-learn=={sklearn.__version__}")
print(f"  numpy=={numpy.__version__}")
print(f"  pandas=={pandas.__version__}")
print(f"  joblib=={joblib.__version__}")

# Quick check that the saved file loads and gives the notebook's example C result (about 18%)
b = joblib.load("outputs/water_source_risk_model.joblib")
print("Model:", b["model_name"], "| AUC on unseen villages:", b["auc_unseen_villages"])
print("Presumed unsafe sources:", b["presumed_unsafe_sources"])

files.download("outputs/water_source_risk_model.joblib")
