import pandas as pd
import joblib
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

print("📂 Loading Combined Data...")
df = pd.read_csv("Combined Data.csv")

print("🧩 Found Columns:", df.columns.tolist())

text_col = "statement"
label_col = "status"

print(f"✔ Using text column: '{text_col}', label column: '{label_col}'")

# =======================
# 🛠 FIX: Drop empty rows
# =======================
df = df[[text_col, label_col]].dropna()
df = df[df[text_col].astype(str).str.strip() != ""]
df = df[df[label_col].astype(str).str.strip() != ""]

texts = df[text_col].astype(str).str.lower()
labels = df[label_col].astype(str)

print(f"📌 Samples after cleaning: {len(df)}")

print("🔠 Vectorizing text (127 features)...")
vectorizer = TfidfVectorizer(max_features=127)
X = vectorizer.fit_transform(texts)

print("✂ Splitting dataset...")
X_train, X_test, y_train, y_test = train_test_split(
    X, labels, test_size=0.2, random_state=42
)

print("🤖 Training Logistic Regression...")
model = LogisticRegression(max_iter=2000)
model.fit(X_train, y_train)

accuracy = model.score(X_test, y_test)
print(f"📊 Accuracy: {accuracy * 100:.2f}%")

print("💾 Saving model...")
joblib.dump(model, "logistic_regression_model.pkl")
joblib.dump(vectorizer, "tfidf_vectorizer.pkl")

print("🎉 Multimodal Text Model Trained & Saved Successfully!")
