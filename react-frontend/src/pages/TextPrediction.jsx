import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';

const TextPrediction = () => {
  const [statement, setStatement] = useState('');
  const [prediction, setPrediction] = useState(null);
  const [aiExplanation, setAiExplanation] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleTextSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setPrediction(null);
    setAiExplanation(null);

    try {
      const response = await api.predictText(statement);
      
      if (response && response.prediction) {
        setPrediction(response.prediction);
        setAiExplanation(response.ai_description || "No explanation available.");
      } else if (response && response.error) {
        setError(response.error);
      } else {
        setError("Failed to analyze text. Please try again.");
      }
    } catch (err) {
      console.error('Text prediction error:', err);
      setError("Error connecting to text analysis service.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="container">
        <div className="page-intro">
          <h2>Share how you feel in your own words</h2>
          <p>Describe what’s on your mind, recent triggers, or anything you’d like our AI coach to reflect back to you. The more detail you share, the more nuanced the guidance.</p>
          <small>📝 Tip: A paragraph or two works best.</small>
        </div>
        <div className="assessment-card">
          <h2>📝 Text-Based Mental Health Assessment</h2>

          <form onSubmit={handleTextSubmit}>
            <div className="info-banner">
              💡 We never store raw statements. They’re used once for analysis, then deleted.
            </div>
            
            <textarea
              value={statement}
              onChange={e => setStatement(e.target.value)}
              placeholder="Describe how you are feeling, your concerns, or what you've been experiencing recently..."
              style={{
                width: "100%",
                minHeight: "150px",
                padding: "1rem",
                borderRadius: "8px",
                border: "2px solid #e5e7eb",
                fontFamily: "inherit",
                fontSize: "1em",
                marginBottom: "1rem"
              }}
            />
            
            <button 
              type="submit" 
              className="btn"
              disabled={loading || !statement.trim()}
              style={{ width: "100%" }}
            >
              {loading ? "⏳ Analyzing..." : "🔍 Analyze Text"}
            </button>
          </form>

          {error && (
            <div style={{
              backgroundColor: "#fee2e2",
              border: "1px solid #fecaca",
              borderRadius: "8px",
              padding: "1rem",
              marginTop: "1.5rem",
              color: "#991b1b"
            }}>
              <strong>⚠️ {error}</strong>
            </div>
          )}

          {prediction && (
            <div style={{ marginTop: "2rem" }}>
              <div className="result-grid">
                <div className="result-card" style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)", color: "white" }}>
                  <span style={{ color: "rgba(255,255,255,0.8)" }}>Analysis Result</span>
                  <strong style={{ color: "white", fontSize: "1.5rem" }}>{prediction}</strong>
                </div>
                <div className="result-card">
                  <span>Suggested action</span>
                  <strong>Review AI insights below</strong>
                </div>
              </div>

              {aiExplanation && (
                <div style={{
                  backgroundColor: "#ffffff",
                  border: "2px solid #e5e7eb",
                  borderRadius: "12px",
                  padding: "1.5rem",
                  boxShadow: "0 4px 12px rgba(0, 0, 0, 0.08)",
                  marginBottom: "1.5rem"
                }}>
                  <h3 style={{ 
                    marginTop: 0, 
                    marginBottom: "1rem", 
                    color: "#667eea",
                    fontSize: "1.2em",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px"
                  }}>
                    💡 AI Insights & Guidance
                  </h3>
                  <div style={{ 
                    whiteSpace: "pre-wrap", 
                    wordWrap: "break-word",
                    lineHeight: "1.6",
                    color: "#374151",
                    fontSize: "0.9em"
                  }}>
                    {aiExplanation}
                  </div>
                </div>
              )}
              
              <div style={{ 
                padding: "1.2rem", 
                backgroundColor: "#fef3c7",
                border: "2px solid #f59e0b",
                borderRadius: "8px",
                color: "#92400e",
                marginBottom: "2rem"
              }}>
                <p style={{ margin: 0, fontSize: "0.9em" }}>
                  <strong>⚠️ Disclaimer:</strong> This is an informational assessment, NOT a medical diagnosis. 
                  Please consult a qualified mental health professional for proper evaluation and treatment.
                </p>
              </div>
            </div>
          )}

          <div style={{ marginTop: "2rem", paddingTop: "2rem", borderTop: "1px solid #e5e7eb" }}>
            <p style={{ textAlign: 'center' }}>
              <button 
                onClick={() => navigate('/symptom-checker')} 
                className="link-button"
              >
                ← Back to Symptom Checker
              </button>
            </p>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TextPrediction;
