import os
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
import pickle

# --- Paths ---
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Correct path (CSV is inside backend folder)
CSV_PATH = os.path.join(BASE_DIR, "mental_symptoms_illness.csv")

print(f"📂 Loading dataset from: {os.path.abspath(CSV_PATH)}")

# --- Load Data ---
df = pd.read_csv(CSV_PATH)

# --- Check ---
if "Disease" not in df.columns:
    raise ValueError("❌ CSV must contain a 'Disease' column as target label!")

# All columns except Disease are features
X = df.drop("Disease", axis=1)
y = df["Disease"]

print("✅ Dataset loaded successfully!")
print("🧠 Features:", X.shape[1])
print("🎯 Unique Diseases:", y.nunique())

# --- Split Data ---
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42, stratify=y
)

# --- Train Model ---
model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

print("✅ Model trained successfully!")

# --- Evaluate ---
accuracy = model.score(X_test, y_test)
print(f"📊 Model Accuracy: {accuracy * 100:.2f}%")

# --- Save Model ---
MODEL_PATH = os.path.join(BASE_DIR, "logistic_regression_model.pkl")
with open(MODEL_PATH, "wb") as f:
    pickle.dump(model, f)

print(f"💾 Model saved at: {MODEL_PATH}")
