import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';

// ✅ Your correct Flask backend IP - MUST MATCH YOUR BACKEND!
// Backend is running on 192.168.1.9:5000 according to your logs
const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://192.168.1.9:5000';

const EmotionPrediction = () => {
  const [emotion, setEmotion] = useState(null);
  const [geminiOutput, setGeminiOutput] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraMode, setCameraMode] = useState(null);
  const [streamUrl, setStreamUrl] = useState(null);
  const videoRef = useRef(null);
  const imageRef = useRef(null);
  const mediaStreamRef = useRef(null);
  const navigate = useNavigate();

  const startCamera = async () => {
    setError(null);

    const canUseNative =
      typeof window !== 'undefined' &&
      window.isSecureContext &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === 'function';

    if (canUseNative) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        mediaStreamRef.current = stream;
        setCameraMode('native');
        setCameraActive(true);
        return;
      } catch (err) {
        console.warn("Native camera unavailable, falling back to backend stream:", err);
      }
    }

    setStreamUrl(`${API_BASE_URL}/video_feed?t=${Date.now()}`);
    setCameraMode('backend');
    setCameraActive(true);
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (cameraMode === 'backend') {
      setStreamUrl(null);
    }
    setCameraMode(null);
    setCameraActive(false);
  };

  useEffect(() => {
    if (cameraMode === 'native' && cameraActive && mediaStreamRef.current && videoRef.current) {
      videoRef.current.srcObject = mediaStreamRef.current;
      videoRef.current.play().catch((err) => console.warn("Auto-play blocked:", err));
    }
    if ((!cameraActive || cameraMode !== 'native') && videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [cameraMode, cameraActive]);

  const ensureVideoReady = async () => {
    if (!videoRef.current) return false;
    if (videoRef.current.readyState >= 2) return true;
    return new Promise((resolve) => {
      const handler = () => {
        videoRef.current?.removeEventListener('loadeddata', handler);
        resolve(true);
      };
      videoRef.current?.addEventListener('loadeddata', handler, { once: true });
      // Add timeout to prevent infinite waiting
      setTimeout(() => {
        videoRef.current?.removeEventListener('loadeddata', handler);
        resolve(false);
      }, 3000);
    });
  };

  const captureAndAnalyze = async () => {
    if (!cameraActive) {
      setError("Camera is not active.");
      return;
    }

    if (cameraMode === 'native') {
      const ready = await ensureVideoReady();
      if (!ready) {
        setError("Video stream not ready. Please try again.");
        return;
      }
    } else if (cameraMode === 'backend') {
      // Wait a bit for the image to load
      if (!imageRef.current || !imageRef.current.complete || imageRef.current.naturalWidth === 0) {
        setError("Waiting for camera frame. Please try again in a moment.");
        return;
      }
    } else {
      setError("Camera mode not set.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const canvas = document.createElement('canvas');
      let width = 640;
      let height = 480;

      if (cameraMode === 'native' && videoRef.current) {
        width = videoRef.current.videoWidth || width;
        height = videoRef.current.videoHeight || height;
      } else if (cameraMode === 'backend' && imageRef.current) {
        width = imageRef.current.naturalWidth || width;
        height = imageRef.current.naturalHeight || height;
      }

      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (cameraMode === 'native' && videoRef.current) {
        ctx.drawImage(videoRef.current, 0, 0, width, height);
      } else if (cameraMode === 'backend' && imageRef.current) {
        ctx.drawImage(imageRef.current, 0, 0, width, height);
      }

      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((blobData) => {
          if (blobData) resolve(blobData);
          else reject(new Error("Unable to capture camera frame."));
        }, 'image/jpeg', 0.85);
      });

      const formData = new FormData();
      formData.append('image', blob, 'emotion_capture.jpg');

      console.log('Sending request to:', `${API_BASE_URL}/predict_emotion`);

      const response = await fetch(`${API_BASE_URL}/predict_emotion`, {
        method: 'POST',
        body: formData,
        mode: "cors",
      });

      console.log('Response status:', response.status);
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok && data.emotion) {
        setEmotion(data.emotion);
        setGeminiOutput(data.gemini_output || "AI recommendations unavailable.");
        stopCamera();
      } else {
        setError(data.error || `Server error: ${response.status}`);
      }
    } catch (err) {
      console.error('Analysis error:', err);
      
      // More specific error messages
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        setError("Cannot connect to server. Please check if the backend is running.");
      } else if (err.message.includes('NetworkError')) {
        setError("Network error. Please check your connection.");
      } else {
        setError(err.message || "Failed to analyze emotion. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <Layout>
      <div className="container">
        <h2>😊 Live Emotion Detection</h2>

        {error && <div className="warning-message">⚠️ {error}</div>}

        {!emotion ? (
          <>
            {!cameraActive ? (
              <button onClick={startCamera} className="btn" style={{ width: "100%" }}>
                📷 Start Camera
              </button>
            ) : (
              <>
                <div style={{ height: "300px", backgroundColor: "#000", borderRadius: "10px", marginBottom: "10px", overflow: "hidden" }}>
                  {cameraMode === 'native' ? (
                    <video ref={videoRef} autoPlay muted playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <img 
                      ref={imageRef} 
                      src={streamUrl} 
                      alt="camera-stream" 
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => {
                        console.error('Image load error:', e);
                        setError('Failed to load camera stream from backend');
                      }}
                      onLoad={() => console.log('Image loaded successfully')}
                    />
                  )}
                </div>

                <button className="btn" onClick={captureAndAnalyze} disabled={loading} style={{ width: "100%" }}>
                  {loading ? "⏳ Analyzing..." : "📸 Capture & Analyze"}
                </button>

                <button className="btn" onClick={stopCamera} style={{ width: "100%", marginTop: "10px", backgroundColor: "#ef4444", color: "#fff" }}>
                  ❌ Stop Camera
                </button>
              </>
            )}
          </>
        ) : (
          <>
            <h3>Detected Emotion: {emotion}</h3>
            <p>{geminiOutput}</p>
            <button className="btn" onClick={() => { setEmotion(null); setGeminiOutput(null); startCamera(); }}>
              🔄 Detect Again
            </button>
          </>
        )}

        <button className="link-button" style={{ marginTop: "20px" }} onClick={() => { stopCamera(); navigate('/symptom-checker'); }}>
          ← Back
        </button>
      </div>
    </Layout>
  );
};

export default EmotionPrediction;