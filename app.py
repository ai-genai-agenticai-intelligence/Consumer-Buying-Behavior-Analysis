import pickle
from pathlib import Path

import pandas as pd
from flask import Flask, jsonify, make_response, render_template, request


PROJECT_DIR = Path(__file__).resolve().parent
DATA_PATH = PROJECT_DIR / "logit classification.csv"
MODEL_PATH = PROJECT_DIR / "svm_model.pkl"
FEATURES = ["Age", "EstimatedSalary"]
PURCHASE_LABELS = {0: "Did not purchase", 1: "Purchased"}

app = Flask(__name__)
app.config["JSON_SORT_KEYS"] = False


def load_data():
    if not DATA_PATH.exists():
        raise FileNotFoundError(f"Dataset not found: {DATA_PATH}")

    data = pd.read_csv(DATA_PATH)
    required_columns = {"Gender", *FEATURES, "Purchased"}
    missing_columns = required_columns.difference(data.columns)
    if missing_columns:
        raise ValueError(
            "Dataset is missing required columns: " + ", ".join(sorted(missing_columns))
        )
    if data.empty:
        raise ValueError("The consumer behavior dataset contains no records.")
    if data[FEATURES + ["Purchased"]].isna().any().any():
        raise ValueError("Age, EstimatedSalary, and Purchased cannot contain missing values.")
    if not set(data["Purchased"].unique()).issubset({0, 1}):
        raise ValueError("Purchased must contain only 0 or 1.")
    return data


def load_model():
    if not MODEL_PATH.exists():
        raise FileNotFoundError(
            f"Model file not found: {MODEL_PATH}. Run the training script to create it."
        )

    with MODEL_PATH.open("rb") as model_file:
        artifact = pickle.load(model_file)

    expected_keys = {"model", "accuracy", "confusion_matrix", "features"}
    if not isinstance(artifact, dict) or not expected_keys.issubset(artifact):
        raise ValueError(
            "The model file has an unsupported format. Retrain it with the project training script."
        )
    model = artifact["model"]
    if artifact["features"] != FEATURES:
        raise ValueError("The model file uses unexpected input features.")
    if not hasattr(model, "predict") or not hasattr(model, "predict_proba"):
        raise ValueError(
            "The saved model must support predictions and probabilities. Retrain the model."
        )
    return model, float(artifact["accuracy"]), artifact["confusion_matrix"]


try:
    DATA = load_data()
    MODEL, MODEL_ACCURACY, MODEL_CONFUSION = load_model()
except (FileNotFoundError, ValueError, pd.errors.ParserError, pickle.UnpicklingError) as error:
    raise RuntimeError(f"Unable to start the Consumer Insights app: {error}") from error


def get_dashboard_stats():
    buyers = DATA[DATA["Purchased"] == 1]
    nonbuyers = DATA[DATA["Purchased"] == 0]
    age_bins = [17, 25, 35, 45, 55, 100]
    age_labels = ["18–25", "26–35", "36–45", "46–55", "56+"]
    age_groups = pd.cut(DATA["Age"], bins=age_bins, labels=age_labels)
    age_purchase_rates = (
        DATA.groupby(age_groups, observed=False)["Purchased"].mean().fillna(0) * 100
    )
    gender_purchase_rates = DATA.groupby("Gender")["Purchased"].mean() * 100
    return {
        "customer_count": len(DATA),
        "buyer_count": int(DATA["Purchased"].sum()),
        "purchase_rate": float(DATA["Purchased"].mean()),
        "average_age": float(DATA["Age"].mean()),
        "average_salary": float(DATA["EstimatedSalary"].mean()),
        "buyer_age": float(buyers["Age"].mean()),
        "nonbuyer_age": float(nonbuyers["Age"].mean()),
        "buyer_salary": float(buyers["EstimatedSalary"].mean()),
        "nonbuyer_salary": float(nonbuyers["EstimatedSalary"].mean()),
        "age_groups": [
            {"label": label, "rate": float(age_purchase_rates[label])}
            for label in age_labels
        ],
        "gender_rates": [
            {"label": str(label), "rate": float(rate)}
            for label, rate in gender_purchase_rates.items()
        ],
        "confusion_matrix": MODEL_CONFUSION,
    }


@app.get("/")
def index():
    stats = get_dashboard_stats()
    customers = DATA.assign(
        Outcome=DATA["Purchased"].map(PURCHASE_LABELS)
    ).drop(columns="Purchased").to_dict(orient="records")
    return render_template(
        "index.html",
        stats=stats,
        customers=customers,
        model_accuracy=MODEL_ACCURACY,
    )


@app.post("/api/predict")
def predict():
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify(error="Send a valid JSON object with age and salary."), 400

    try:
        age = float(payload["age"])
        salary = float(payload["salary"])
    except (KeyError, TypeError, ValueError):
        return jsonify(error="Age and salary must be valid numbers."), 400

    if not age.is_integer() or not 18 <= age <= 100:
        return jsonify(error="Age must be a whole number from 18 to 100."), 400
    if not salary.is_integer() or not 0 <= salary <= 1_000_000:
        return jsonify(error="Salary must be a whole number from 0 to 1,000,000."), 400

    customer = pd.DataFrame(
        [{"Age": int(age), "EstimatedSalary": int(salary)}],
        columns=FEATURES,
    )
    prediction = int(MODEL.predict(customer)[0])
    probability = float(MODEL.predict_proba(customer)[0][1])
    return jsonify(
        prediction=prediction,
        outcome=PURCHASE_LABELS[prediction],
        probability=probability,
        age=int(age),
        salary=int(salary),
    )


@app.get("/download")
def download():
    outcome = request.args.get("outcome", "all")
    if outcome not in {"all", "purchased", "not-purchased"}:
        return jsonify(error="Invalid purchase outcome filter."), 400

    filtered = DATA
    if outcome == "purchased":
        filtered = DATA[DATA["Purchased"] == 1]
    elif outcome == "not-purchased":
        filtered = DATA[DATA["Purchased"] == 0]

    response = make_response(filtered.to_csv(index=False))
    response.headers["Content-Type"] = "text/csv; charset=utf-8"
    response.headers["Content-Disposition"] = (
        'attachment; filename="consumer_buying_behavior.csv"'
    )
    return response


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=False)
