/* global webkitSpeechRecognition */

import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';

const MultimodalPrediction = () => {
  const [statement, setStatement] = useState('');
  const [textPrediction, setTextPrediction] = useState(null);
  const [emotion, setEmotion] = useState(null);
  const [combined, setCombined] = useState(null);
  const [geminiOutput, setGeminiOutput] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [liveText, setLiveText] = useState('...');
  const recognitionRef = useRef(null);
  const transcriptRef = useRef('');
  const navigate = useNavigate();

  const startVoiceAndVideo = () => {
    if (!('webkitSpeechRecognition' in window)) {
      setLiveText('Error: Speech recognition not supported.');
      return;
    }

    const recognition = new webkitSpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognitionRef.current = recognition;
    transcriptRef.current = '';
    setIsListening(true);
    setLiveText('Say something now...');

    recognition.start();

    recognition.onresult = (event) => {
      let transcript = '';
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          transcript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
      const currentText = (transcript + interimTranscript).trim();
      if (transcript.trim()) {
        transcriptRef.current = transcript.trim();
        setStatement(transcript.trim());
      }
      setLiveText(currentText || '...');
    };

    recognition.onend = async () => {
      setIsListening(false);
      const finalStatement = transcriptRef.current.trim();
      if (finalStatement) {
        setStatement(finalStatement);
        setLiveText(finalStatement);
        try {
          const result = await api.predictMultimodal(finalStatement);
          if (result.error) {
            setLiveText(result.error);
            setTextPrediction(null);
            setEmotion(null);
            setCombined(null);
            setGeminiOutput(null);
            return;
          }
          setTextPrediction(result.text_prediction || 'Not available');
          setEmotion(result.emotion_detected || 'Not detected');
          setCombined(result.combined_result || 'No combined result');
          setGeminiOutput(result.gemini_output || '');
        } catch (err) {
          console.error('Multimodal prediction error:', err);
          setLiveText('Unable to generate prediction. Please try again.');
        }
      } else {
        setLiveText('No clear speech detected. Please check your microphone and try again.');
      }
    };

    recognition.onerror = (event) => {
      setIsListening(false);
      setLiveText(`Speech error: ${event.error}`);
    };
  };

  const stopRecognition = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  return (
    <Layout>
      <div className="container">
        <div className="page-intro">
          <h2>Multimodal Mental Health Assessment</h2>
          <p>Blend live emotion signals with the words you speak for a richer reflection. We never store any video—frames are analyzed in real time and discarded immediately.</p>
          <div className="stat-pill-group">
            <div className="stat-pill">
              <span>Input</span>
              <strong>Voice + Video</strong>
            </div>
            <div className="stat-pill">
              <span>Processing time</span>
              <strong>&lt; 10 seconds</strong>
            </div>
            <div className="stat-pill">
              <span>Output</span>
              <strong>Text · Emotion · Summary</strong>
            </div>
          </div>
        </div>
        <div className="assessment-card">
          <div className="info-banner">
            🎧 Find a quiet spot, speak naturally for 5–10 seconds, and keep your face visible for accurate readings.
          </div>

          <div className="dual-panel">
            <div className="panel">
              <h4>Live video feed</h4>
              <img id="video-stream-img" src={api.getVideoFeedUrl()} alt="Video Stream" />
              <button
                type="button"
                className="btn btn-voice"
                onClick={isListening ? stopRecognition : startVoiceAndVideo}
                style={{ marginTop: '1.5rem', width: '100%' }}
              >
                {isListening ? '🎙 Listening... (Click to Stop)' : '🎤 Start Voice + Video Prediction'}
              </button>
              <p className="live-text-area"><strong>You said:</strong> {liveText}</p>
              <ul style={{ marginTop: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem', paddingLeft: '1.2rem' }}>
                <li>Click once to start recording.</li>
                <li>Speak a short reflection or check-in.</li>
                <li>We’ll stop automatically when transcription ends.</li>
              </ul>
            </div>

            <div className="panel">
              <h4>Prediction summary</h4>
              {statement ? (
                <div className="result-grid" style={{ marginTop: 0 }}>
                  <div className="result-card">
                    <span>Text insight</span>
                    <strong>{textPrediction || 'Processing...'}</strong>
                  </div>
                  <div className="result-card">
                    <span>Emotion tone</span>
                    <strong>{emotion || 'Processing...'}</strong>
                  </div>
                  <div className="result-card" style={{ gridColumn: '1 / -1' }}>
                    <span>Combined result</span>
                    <strong>{combined || 'Processing...'}</strong>
                  </div>
                </div>
              ) : (
                <p style={{ color: 'var(--text-muted)' }}>Your combined insights will appear here after a short recording.</p>
              )}
            </div>
          </div>

          {geminiOutput && geminiOutput !== 'None' && geminiOutput !== '' && (
            <div className="ai-analysis-box">
              <h3>🤖 AI Analysis & Recommendations</h3>
              <p dangerouslySetInnerHTML={{ __html: geminiOutput }} />
            </div>
          )}

          <p style={{ textAlign: 'center', marginTop: '2rem' }}>
            <button
              type="button"
              className="link-button"
              onClick={() => navigate('/symptom-checker')}
            >
              ← Go back to Symptom Checker
            </button>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default MultimodalPrediction;