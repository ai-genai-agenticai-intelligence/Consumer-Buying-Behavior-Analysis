# Consumer Buying Behavior Analysis
liveDemo -https://consumer-buying-behavior-analysis.onrender.com
A Flask dashboard for exploring customer purchase behavior and predicting purchase propensity with a saved Support Vector Machine (SVM) model.

## Features

- Customer overview with purchase rate, average age, and model accuracy.
- Purchase pattern chart and summary insights.
- Purchase predictions using the saved `svm_model.pkl` pipeline.
- Age-group and gender analysis with searchable, filterable customer records.
- CSV download for all customers or a selected purchase outcome.

The prediction model uses **Age** and **EstimatedSalary** only. Gender is displayed for descriptive analysis and is not used as a model input.

## Run locally

Use Python 3.10 or newer. From this project directory, install the dependencies and start Flask:

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
python app.py
```

Open [http://127.0.0.1:5000](http://127.0.0.1:5000).

## Retrain the model

The training script evaluates the model on a held-out split, then saves the complete fitted preprocessing and SVM pipeline to `svm_model.pkl`:

```powershell
python "7-Logistic Regression Classification  - SVM model.py"
```

Keep the generated pickle alongside `app.py`. Python pickle files should only be loaded from a trusted source.

## Project files

- `app.py` — Flask routes, CSV/model loading, prediction API, and downloads.
- `templates/index.html` — dashboard pages.
- `static/styles.css` and `static/app.js` — responsive UI and browser interactions.
- `logit classification.csv` — customer dataset.
- `svm_model.pkl` — fitted model artifact used by Flask.
- `7-Logistic Regression Classification  - SVM model.py` — model training and export script.
- `requirements.txt` — Python dependencies.
