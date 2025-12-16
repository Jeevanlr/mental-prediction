import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "../components/Layout";
import { SYMPTOMS } from "../utils/symptoms";
import { api } from "../services/api";

const SymptomChecker = () => {
  const [selectedSymptoms, setSelectedSymptoms] = useState({});
  const [prediction, setPrediction] = useState(null);
  const [aiDescription, setAiDescription] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // ✅ Toggle symptom checkbox
  const handleCheckbox = (symptomName) => {
    setSelectedSymptoms((prev) => ({
      ...prev,
      [symptomName]: prev[symptomName] ? 0 : 1,
    }));
  };

  // ✅ Send selected symptoms to backend (JSON)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const symptomsData = {};
    SYMPTOMS.forEach(({ name }) => {
      symptomsData[name] = selectedSymptoms[name] || 0;
    });

    try {
      const response = await api.predictSymptoms(symptomsData);
      if (response && response.prediction) {
        setPrediction(response.prediction);
        setAiDescription(response.ai_description || "No AI summary provided.");
      } else {
        setPrediction("No prediction available");
        setAiDescription("AI description unavailable.");
      }
    } catch (err) {
      console.error("Prediction error:", err);
      setPrediction("Error fetching prediction");
      setAiDescription("");
    } finally {
      setLoading(false);
    }
  };

  // ✅ Logout
  const handleLogout = async () => {
    await api.logout();
    navigate("/login");
  };

  return (
    <Layout>
      <div className="container">
        <div className="page-intro">
          <h2>Personalized Symptom Check</h2>
          <p>Take a quick reflection on how you’re feeling today. Your responses help us highlight patterns and prepare guidance tailored just for you.</p>
          <div className="stat-pill-group">
            <div className="stat-pill">
              <span>Questions</span>
              <strong>{Array.isArray(SYMPTOMS) ? SYMPTOMS.length : 0}</strong>
            </div>
            <div className="stat-pill">
              <span>Estimated time</span>
              <strong>~ 2 minutes</strong>
            </div>
            <div className="stat-pill">
              <span>Scientifically mapped</span>
              <strong>Symptoms ➜ Conditions</strong>
            </div>
          </div>
        </div>

        <div className="checker-card">
          <h2>🩺 Mental Health Self-Assessment</h2>
          <div className="info-banner">
            💡 Select every symptom that resonates with you today—even if it feels small. Honest check-ins unlock the most helpful recommendations.
          </div>
          <form onSubmit={handleSubmit}>
            <p
              style={{
                marginBottom: "2rem",
                color: "hsl(220, 10%, 40%)",
                textAlign: "center",
                fontSize: "1.1em",
              }}
            >
              Please select the symptoms you are currently experiencing.
            </p>

            <div className="symptom-list">
              {Array.isArray(SYMPTOMS) &&
                SYMPTOMS.map(({ name, category }, idx) => (
                  <div className="symptom-item" key={idx}>
                    <input
                      type="checkbox"
                      id={`symptom_${idx}`}
                      checked={selectedSymptoms[name] === 1}
                      onChange={() => handleCheckbox(name)}
                    />
                    <label htmlFor={`symptom_${idx}`}>
                      <strong>{name.replace(/_/g, " ")}</strong>
                      <span style={{ color: "#999", fontSize: "0.9em", marginLeft: "8px" }}>
                        ({category})
                      </span>
                    </label>
                  </div>
                ))}
            </div>

            <div style={{ marginTop: "2rem", textAlign: "center" }}>
              <button type="submit" className="btn" disabled={loading}>
                {loading ? "Analyzing..." : "Predict Condition"}
              </button>
            </div>
          </form>

          {prediction && (
            <div className="ai-summary">
              <div className="result-grid">
                <div className="result-card">
                  <span>Predicted pattern</span>
                  <strong>{prediction}</strong>
                </div>
                <div className="result-card">
                  <span>Next best step</span>
                  <strong>Review AI summary below</strong>
                </div>
              </div>
              {aiDescription && (
                <div style={{ marginTop: "1.5rem", lineHeight: "1.7" }}>
                  <h4>🧠 AI Summary & Recommendations:</h4>
                  <div style={{ 
                    whiteSpace: "pre-wrap", 
                    wordWrap: "break-word",
                    color: "#444",
                    fontSize: "0.95em"
                  }}>
                    {aiDescription}
                  </div>
                  <div style={{ 
                    marginTop: "1.5rem", 
                    padding: "1rem", 
                    backgroundColor: "#fef3c7",
                    borderLeft: "4px solid #f59e0b",
                    borderRadius: "4px",
                    color: "#92400e"
                  }}>
                    <strong>⚠️ Important Disclaimer:</strong> This assessment is for informational purposes only and is NOT a medical diagnosis. 
                    Please consult with a qualified mental health professional for proper evaluation and treatment.
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="button-group" style={{ marginTop: "2rem" }}>
            <button
              onClick={() => navigate("/text-prediction")}
              className="btn btn-secondary"
            >
              Text Analysis
            </button>
            <button
              onClick={() => navigate("/emotion")}
              className="btn btn-secondary"
            >
              Emotion Detection
            </button>
            <button
              onClick={() => navigate("/multimodal")}
              className="btn btn-secondary"
            >
              Multimodal Analysis
            </button>
          </div>

          <p style={{ textAlign: "right", marginTop: "2rem" }}>
            <button
              onClick={handleLogout}
              className="link-button danger"
            >
              Logout
            </button>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default SymptomChecker;
