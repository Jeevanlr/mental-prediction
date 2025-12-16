import os
import json
import traceback
from flask import Flask, request, jsonify, session, Response, make_response
import pandas as pd
import joblib
import cv2
import numpy as np
# DeepFace imported lazily in predict_emotion to avoid startup crashes
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold
from flask_cors import CORS

# ==========================
# Paths
# ==========================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USER_FILE = os.path.join(BASE_DIR, "users.json")

# ==========================
# Flask Configuration
# ==========================
app = Flask(__name__)
app.secret_key = "your_secret_key"

# Enable full CORS for React
CORS(app, resources={r"/*": {"origins": "*"}}, supports_credentials=True)


def load_artifact(*relative_paths):
    """Try multiple relative paths and load the first existing joblib artifact."""
    for rel_path in relative_paths:
        candidate = os.path.join(BASE_DIR, rel_path)
        if os.path.exists(candidate):
            return joblib.load(candidate)
    raise FileNotFoundError(f"None of the artifact paths exist: {relative_paths}")

# ==========================
# Load Models
# ==========================
try:
    clf = joblib.load(os.path.join(BASE_DIR, "model.pkl"))
    le = joblib.load(os.path.join(BASE_DIR, "label_encoder.pkl"))
    text_model = load_artifact("logistic_regression_model.pkl")
    vectorizer = load_artifact("tfidf_vectorizer.pkl")
    print("✅ All models loaded successfully")
except Exception as e:
    print(f"⚠️ Error loading models: {e}")
    print("⚠️ Some features may not work. Continuing startup...")
    # Set to None so we can check later
    clf = None
    le = None
    text_model = None
    vectorizer = None

# ==========================
# Gemini API Configuration
# ==========================
# Use environment variable for API key in production
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")

if GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
else:
    # Backend will still run, but Gemini-based features will fall back
    print("⚠️ GEMINI_API_KEY is not set. Gemini features will not work.")

# Safety settings to allow mental health discussions
safety_settings = {
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

# ==========================
# Load Symptom Features
# ==========================
try:
    symptoms_df = pd.read_csv(os.path.join(BASE_DIR, "mental_symptoms_illness.csv"))
    symptoms = [col for col in symptoms_df.columns if col != "Disease"]
    print("✅ Symptoms data loaded successfully")
except Exception as e:
    print(f"⚠️ Error loading symptoms CSV: {e}")
    symptoms = []
    symptoms_df = None


# ==========================
# Utility Functions
# ==========================
def load_users():
    if not os.path.exists(USER_FILE):
        with open(USER_FILE, "w") as f:
            json.dump([], f)
    with open(USER_FILE, "r") as f:
        try:
            return json.load(f)
        except json.JSONDecodeError:
            return []


def save_users(users):
    with open(USER_FILE, "w") as f:
        json.dump(users, f, indent=2)


def call_gemini_api(prompt, model_name="gemini-pro"):
    """Helper function to call Gemini API with error handling"""
    try:
        print(f"🤖 Calling Gemini API ({model_name})...")
        model = genai.GenerativeModel(model_name)
        response = model.generate_content(prompt, safety_settings=safety_settings)
        
        if response and response.text:
            print(f"✅ Gemini response received: {response.text[:100]}...")
            return response.text.strip()
        else:
            print(f"⚠️ Empty response from Gemini")
            if hasattr(response, 'prompt_feedback'):
                print(f"   Prompt feedback: {response.prompt_feedback}")
            return None
            
    except Exception as e:
        print(f"⚠️ Gemini API error: {e}")
        return None


# ==========================
# Auth Routes
# ==========================
@app.route("/register", methods=["POST"])
def register():
    data = request.form.to_dict() or request.get_json()
    users = load_users()

    if any(u["email"] == data["email"] for u in users):
        return jsonify({"message": "User already exists"}), 400

    new_id = max([u["id"] for u in users], default=0) + 1
    data["id"] = new_id
    users.append(data)
    save_users(users)
    return jsonify({"message": "Registration successful!"}), 201


@app.route("/login", methods=["POST"])
def login():
    data = request.form.to_dict() or request.get_json()
    email = data.get("email")
    password = data.get("password")
    users = load_users()

    for u in users:
        if u["email"] == email and u["password"] == password:
            session["user_id"] = u["id"]
            return jsonify({"message": "Login successful"}), 200
    return jsonify({"message": "Invalid credentials"}), 401


@app.route("/logout", methods=["GET", "POST"])
def logout():
    session.pop("user_id", None)
    return jsonify({"message": "Logged out successfully"}), 200


# ==========================
# Symptom Prediction
# ==========================
@app.route("/predict_symptoms", methods=["POST"])
def predict_symptoms():
    try:
        # Check if models are loaded
        if clf is None or le is None or not symptoms:
            return jsonify({
                "error": "Models not loaded. Please check server logs.",
                "prediction": "Unknown",
                "ai_description": "The prediction service is temporarily unavailable. Please try again later."
            }), 503
        
        data = request.get_json(force=True)
        print("raw data:", repr(data))

        if not data:
            return jsonify({"error": "No input data provided"}), 400

        if isinstance(data, dict) and "symptoms" in data:
            payload = data["symptoms"]
        else:
            payload = data

        frontend_to_backend = {
            "sadness": ["sadness", "depressive_symptoms", "low_mood"],
            "anxiety": ["severe_anxiety", "excessive_worry", "feeling_on_edge"],
            "sleep_disturbance": ["sleep_disturbance", "sleep_problem_from_obsessive_thinking", "decreased_need_for_sleep"],
            "loss_of_interest": ["loss_of_interest", "loss_of_pleasure", "inability_to_feel_pleasure"],
            "fatigue": ["fatigue", "feeling_easily_tired"],
            "difficulty_concentrating": ["difficulty_concentrating", "trouble_concentrating ", "mind_going_blank"],
            "social_isolation": ["social_isolation", "social_withdrawal", "avoidance_of_social_activity"],
            "irritability": ["irritability", "irritable_mood", "intense_anger"],
            "excessive_worry": ["excessive_worry", "excessive_fear_of_mistakes"],
            "low_energy": ["low_energy", "lack_of_motivation"],
        }

        sample = {feat: 0 for feat in symptoms}

        def is_positive(val):
            if isinstance(val, bool):
                return val
            try:
                s = str(val).strip().lower()
            except Exception:
                return False
            return s in ("1", "true", "on", "yes")

        for k, v in payload.items():
            mapped = frontend_to_backend.get(k, [k] if k in sample else [])

            for backend_feat in mapped:
                if backend_feat in sample:
                    sample[backend_feat] = 1 if is_positive(v) else 0

        ordered_values = [sample[feat] for feat in symptoms]
        df = pd.DataFrame([ordered_values], columns=symptoms)

        pred = clf.predict(df)[0]
        pred_disease = le.inverse_transform([pred])[0]
        
        print(f"🎯 Predicted condition: {pred_disease}")

        # Get selected symptoms
        selected_symptoms = [k for k, v in payload.items() if is_positive(v)]
        symptom_text = ", ".join(selected_symptoms) if selected_symptoms else "general symptoms"

        # Generate AI Summary
        prompt = f"""You are a compassionate mental health assistant.

Condition detected: {pred_disease}
Symptoms reported: {symptom_text}

Provide a brief, empathetic summary (3-4 sentences) that includes:
1. A supportive acknowledgment of the condition
2. General recommendations for managing these symptoms
3. Gentle encouragement to seek professional help

Keep the tone warm, supportive, and non-judgmental."""

        ai_description = call_gemini_api(prompt)
        
        if not ai_description:
            print("⚠️ Using fallback message")
            fallback_messages = {
                "Depression": "Depression is a common but serious condition. It's important to reach out for support from friends, family, or a mental health professional. Self-care activities like exercise, good sleep, and social connection can help. Remember, seeking help is a sign of strength.",
                
                "Anxiety": "Anxiety disorders are treatable conditions. Consider practicing relaxation techniques like deep breathing or meditation. Regular exercise and maintaining a consistent sleep schedule can help. A mental health professional can provide effective treatments.",
                
                "Anxiety Disorder": "Anxiety disorders are treatable conditions. Consider practicing relaxation techniques like deep breathing or meditation. Regular exercise and maintaining a consistent sleep schedule can help. A mental health professional can provide effective treatments.",
                
                "Bipolar Disorder": "Bipolar disorder requires professional management for the best outcomes. Maintaining a regular sleep schedule and taking prescribed medications consistently are important. Working with a psychiatrist and therapist can help manage mood episodes effectively.",
                
                "Normal": "Your responses suggest you're in a good mental health state. Continue maintaining healthy habits like regular exercise, good sleep, and social connections. Remember, it's always okay to reach out for support if things change.",
                
                "Stress": "Stress is a normal response but chronic stress needs attention. Try stress management techniques like exercise, meditation, or talking to someone. If stress persists, consider consulting a mental health professional."
            }
            
            ai_description = fallback_messages.get(
                pred_disease, 
                f"Based on your symptoms, it appears you may have {pred_disease}. Please consult with a qualified mental health professional for proper evaluation and treatment. Your mental health matters."
            )

        return jsonify({
            "prediction": pred_disease,
            "ai_description": ai_description
        }), 200

    except Exception as e:
        print(f"🔥 ERROR in predict_symptoms: {str(e)}")
        traceback.print_exc()
        return jsonify({
            "error": str(e),
            "trace": traceback.format_exc()
        }), 500


# ==========================
# Text Prediction
# ==========================
@app.route("/predict_text", methods=["POST"])
def predict_text():
    try:
        statement = request.form.get("statement", "") or (request.json.get("statement") if request.is_json else "")
        if not statement:
            return jsonify({"message": "No statement provided"}), 400

        statement_lower = statement.lower()
        keyword_mapping = {
            "Depression": ["sad", "hopeless", "empty"],
            "Anxiety": ["anxious", "panic", "fear"],
            "Sleep Disorder": ["sleep", "tired", "insomnia"],
            "Social Anxiety": ["social", "public", "awkward"],
            "Bipolar Disorder": ["mood", "manic", "energetic"],
            "PTSD": ["trauma", "flashback", "abuse"],
            "OCD": ["obsess", "ritual"],
            "ADHD": ["focus", "distract"],
            "Eating Disorder": ["eating", "weight"],
            "General Stress": ["stress", "pressure"]
        }

        condition_scores = {
            cond: sum(1 for k in keys if k in statement_lower)
            for cond, keys in keyword_mapping.items()
        }

        if max(condition_scores.values()) > 0:
            predicted_condition = max(condition_scores, key=condition_scores.get)
        else:
            predicted_condition = "General Mental Health Concern"

        print(f"🎯 Text prediction: {predicted_condition}")

        # Generate AI Summary
        prompt = f"""You are a compassionate mental health assistant.

A person wrote: "{statement}"

Based on this, {predicted_condition} was detected.

Provide a brief, empathetic response (2-3 sentences) that:
1. Acknowledges their feelings
2. Offers a supportive message
3. Gently encourages seeking help if appropriate

Keep the tone warm and non-judgmental."""

        ai_description = call_gemini_api(prompt)
        
        if not ai_description:
            print("⚠️ Using fallback message")
            fallback_messages = {
                "Depression": "It sounds like you're going through a difficult time. Depression is treatable, and reaching out for support is an important step. Consider talking to a mental health professional who can help.",
                
                "Anxiety": "Anxiety can be overwhelming. Remember that what you're feeling is valid. Consider practicing relaxation techniques and speaking with a therapist who can provide effective coping strategies.",
                
                "Sleep Disorder": "Sleep issues can significantly impact your well-being. Try maintaining a consistent sleep schedule and creating a relaxing bedtime routine. If problems persist, consult a healthcare provider.",
                
                "Social Anxiety": "Social anxiety is common and manageable. Taking small steps and being kind to yourself is important. A therapist can help you develop strategies to feel more comfortable in social situations.",
                
                "Bipolar Disorder": "Mood fluctuations can be challenging. Professional support is important for managing bipolar disorder effectively. Consider reaching out to a psychiatrist who can provide appropriate treatment.",
                
                "PTSD": "Trauma can have lasting effects. You deserve support in processing these experiences. A trauma-informed therapist can help you work through what you've been through.",
                
                "OCD": "Intrusive thoughts and compulsions can be distressing. OCD is treatable with proper therapy. Consider consulting a mental health professional who specializes in OCD treatment.",
                
                "ADHD": "Difficulty focusing is a common experience. ADHD is manageable with the right support and strategies. Consider talking to a healthcare provider about evaluation and treatment options.",
                
                "Eating Disorder": "Your relationship with food and body image matters. Eating disorders require specialized treatment. Please reach out to a healthcare provider who can offer appropriate support.",
                
                "General Stress": "It's understandable to feel stressed. Remember to take care of yourself through this challenging time. If stress becomes overwhelming, don't hesitate to seek professional support."
            }
            
            ai_description = fallback_messages.get(
                predicted_condition,
                "Thank you for sharing. Your mental health matters. Consider reaching out to a mental health professional for personalized support and guidance."
            )

        return jsonify({
            "prediction": predicted_condition,
            "ai_description": ai_description
        }), 200

    except Exception as e:
        print(f"🔥 ERROR in predict_text: {str(e)}")
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ==========================
# Emotion Prediction
# ==========================
@app.route("/predict_emotion", methods=["POST", "OPTIONS"])
def predict_emotion():
    # Handle OPTIONS preflight request
    if request.method == "OPTIONS":
        response = make_response()
        response.headers.add("Access-Control-Allow-Origin", "*")
        response.headers.add("Access-Control-Allow-Headers", "Content-Type")
        response.headers.add("Access-Control-Allow-Methods", "POST, OPTIONS")
        return response, 200
    
    print("\n📌 /predict_emotion hit!")
    print(f"Files in request: {list(request.files.keys())}")
    print(f"Form data: {list(request.form.keys())}")

    try:
        if "image" not in request.files:
            print("❌ No image in request")
            response = jsonify({"error": "No image provided"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 400

        image_file = request.files["image"]
        print(f"📷 Image file received: {image_file.filename}")
        
        file_bytes = np.frombuffer(image_file.read(), np.uint8)
        print(f"📊 File bytes length: {len(file_bytes)}")
        
        frame = cv2.imdecode(file_bytes, cv2.IMREAD_COLOR)

        if frame is None:
            print("❌ Failed to decode image")
            response = jsonify({"error": "Invalid image format"})
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 400

        print(f"✅ Image decoded successfully, shape: {frame.shape}")
        print("🧠 Running DeepFace...")
        
        # Lazy import DeepFace to avoid startup crashes
        try:
            from deepface import DeepFace
        except Exception as import_error:
            print(f"⚠️ DeepFace import failed: {import_error}")
            response = jsonify({
                "error": "Emotion detection service is temporarily unavailable. Please try again later."
            })
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 503
        
        result = DeepFace.analyze(
            img_path=frame,
            actions=["emotion"],
            enforce_detection=False,
            detector_backend='opencv'
        )

        print("📊 DeepFace raw result:", result)

        if isinstance(result, list):
            if len(result) == 0:
                print("❌ DeepFace returned empty list")
                response = jsonify({
                    "error": "No face detected. Please ensure your face is visible and well-lit."
                })
                response.headers.add("Access-Control-Allow-Origin", "*")
                return response, 200
            result = result[0]

        detected_emotion = None
        
        if "dominant_emotion" in result:
            detected_emotion = result["dominant_emotion"]
        elif "emotion" in result:
            if isinstance(result["emotion"], dict):
                emotions = result["emotion"]
                detected_emotion = max(emotions, key=emotions.get)
            elif isinstance(result["emotion"], str):
                detected_emotion = result["emotion"]

        print(f"🎯 Detected emotion: {detected_emotion}")

        if not detected_emotion:
            print("❌ Could not extract emotion from result")
            response = jsonify({
                "error": "Unable to detect emotion. Try turning on lights and face the camera."
            })
            response.headers.add("Access-Control-Allow-Origin", "*")
            return response, 200

        # Generate AI Summary
        prompt = f"""You are a compassionate mental health assistant.

The detected emotion is: {detected_emotion}

Provide a brief, empathetic supportive message (2-3 sentences) that:
1. Acknowledges the emotion
2. Offers comfort or encouragement
3. Provides a gentle suggestion for wellbeing

Keep it warm and supportive."""

        gemini_output = call_gemini_api(prompt)
        
        if not gemini_output:
            print("⚠️ Using fallback message")
            fallback_messages = {
                "happy": "It's wonderful to see you happy! Keep embracing the positive moments. 😊",
                "sad": "It's okay to feel sad. Remember, this feeling is temporary and you're not alone. 💙",
                "angry": "Take a deep breath. It's natural to feel angry, but you have the strength to work through it. 💪",
                "fear": "Feeling fearful is valid. Take things one step at a time, and be kind to yourself. 🌟",
                "surprise": "Surprises can be overwhelming! Take a moment to process what you're feeling. ✨",
                "neutral": "You seem calm and balanced. This is a great state for reflection. 🧘",
                "disgust": "If something is bothering you, it's okay to step away and take care of yourself. 🌿"
            }
            gemini_output = fallback_messages.get(
                detected_emotion.lower(), 
                "You are stronger than you think. Take care of your mental health. ❤️"
            )

        print("✅ Emotion prediction successful!")
        response = jsonify({
            "emotion": detected_emotion.capitalize(),
            "gemini_output": gemini_output
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 200

    except ValueError as ve:
        print(f"🔥 ValueError in predict_emotion: {str(ve)}")
        print(traceback.format_exc())
        response = jsonify({
            "error": "Face detection failed. Please ensure your face is clearly visible."
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500
        
    except Exception as e:
        print(f"🔥 ERROR in predict_emotion: {str(e)}")
        print(f"Error type: {type(e).__name__}")
        print(traceback.format_exc())
        response = jsonify({
            "error": f"Emotion detection failed: {str(e)}"
        })
        response.headers.add("Access-Control-Allow-Origin", "*")
        return response, 500


# ==========================
# Video Stream
# ==========================
def generate_video_frames():
    camera = cv2.VideoCapture(0)
    if not camera.isOpened():
        raise RuntimeError("Unable to access the camera.")

    try:
        while True:
            success, frame = camera.read()
            if not success:
                break

            ret, buffer = cv2.imencode(".jpg", frame)
            if not ret:
                continue

            frame_bytes = buffer.tobytes()
            yield (
                b"--frame\r\n"
                b"Content-Type: image/jpeg\r\n\r\n" + frame_bytes + b"\r\n"
            )
    finally:
        camera.release()


@app.route("/video_feed")
def video_feed():
    resp = Response(generate_video_frames(), mimetype="multipart/x-mixed-replace; boundary=frame")
    origin = request.headers.get("Origin")
    resp.headers["Access-Control-Allow-Origin"] = origin if origin else "*"
    resp.headers["Cache-Control"] = "no-store"
    return resp


# ==========================
# Multimodal Prediction
# ==========================
def detect_text_emotion(text):
    emotion_keywords = {
        "Sad": ["sad", "down", "depressed"],
        "Anxious": ["anxious", "panic"],
        "Angry": ["angry", "mad"],
        "Stressed": ["stress", "overwhelm"],
        "Happy": ["happy", "excited"]
    }

    text_lower = text.lower()
    scores = {e: sum(1 for k in keys if k in text_lower) for e, keys in emotion_keywords.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "Neutral"


@app.route("/predict_multimodal", methods=["POST"])
def predict_multimodal():
    try:
        json_payload = request.get_json(silent=True) if request.is_json else None
        statement = (
            request.form.get("statement")
            or (json_payload or {}).get("statement")
            or ""
        ).strip()

        if not statement:
            return jsonify({"error": "No statement provided"}), 400

        vector = vectorizer.transform([statement.lower()])
        text_pred = text_model.predict(vector)[0]
        confidence = float(text_model.predict_proba(vector)[0].max())

        detected_emotion = detect_text_emotion(statement)

        combined_result = (
            f"{text_pred} with a {detected_emotion} tone ({confidence * 100:.1f}% confidence)"
        )
        
        print(f"🎯 Multimodal prediction: {combined_result}")

        # Generate AI Summary
        prompt = f"""You are a compassionate mental health assistant.

A person wrote: "{statement}"

Analysis shows: {text_pred} with a {detected_emotion} tone

Provide a brief, empathetic response (2-3 sentences) that:
1. Acknowledges their emotional state
2. Offers supportive guidance
3. Encourages healthy coping or professional help if appropriate

Keep it warm and supportive."""

        gemini_output = call_gemini_api(prompt)
        
        if not gemini_output:
            print("⚠️ Using fallback message")
            emotion_responses = {
                "Sad": "It's okay to feel sad. These feelings are valid and temporary. Consider reaching out to someone you trust or a mental health professional.",
                "Anxious": "Anxiety can feel overwhelming. Try taking slow, deep breaths. If anxiety persists, professional support can provide effective coping strategies.",
                "Angry": "Anger is a natural emotion. Take a moment to breathe and identify what's causing these feelings. Talking to someone can help process these emotions.",
                "Stressed": "Stress is a normal response to challenges. Make sure you're taking breaks and practicing self-care. If stress becomes unmanageable, seek support.",
                "Happy": "It's wonderful that you're feeling positive! Keep nurturing your mental wellbeing through healthy activities and connections.",
                "Neutral": "You seem balanced right now. Continue with healthy habits and remember that support is available if you need it."
            }
            
            gemini_output = emotion_responses.get(
                detected_emotion,
                f"Your emotional state suggests {text_pred.lower()}. Taking care of your mental health is important. Consider speaking with a professional for personalized support."
            )

        return jsonify({
            "text_prediction": text_pred,
            "emotion_detected": detected_emotion,
            "combined_result": combined_result,
            "gemini_output": gemini_output
        }), 200

    except Exception as e:
        print("🔥 ERROR:", str(e))
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500


# ==========================
# Chatbot
# ==========================
@app.route("/chat", methods=["POST"])
def chat():
    try:
        data = request.get_json()
        message = data.get("message", "")

        prompt = f"You are a friendly and supportive mental health assistant. Respond to: {message}"
        reply = call_gemini_api(prompt)
        
        if not reply:
            reply = "I'm here to listen and support you. How can I help you today?"

        return jsonify({"reply": reply}), 200

    except Exception as e:
        print(f"🔥 ERROR in chat: {str(e)}")
        return jsonify({"reply": f"Error: {str(e)}"}), 500


# ==========================
# Home
# ==========================
@app.route("/", methods=["GET"])
def home():
    return jsonify({"message": "Flask backend is running successfully!"}), 200


# ==========================
# Run Flask
# ==========================
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True, use_reloader=False)