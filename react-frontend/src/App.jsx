import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import SymptomChecker from './pages/SymptomChecker';
import TextPrediction from './pages/TextPrediction';
import MultimodalPrediction from './pages/MultimodalPrediction';
import EmotionPrediction from './pages/EmotionPrediction';
import './styles/App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/symptom-checker" element={<SymptomChecker />} />
        <Route path="/text-prediction" element={<TextPrediction />} />
        <Route path="/multimodal" element={<MultimodalPrediction />} />
        <Route path="/emotion" element={<EmotionPrediction />} />
      </Routes>
    </Router>
  );
}

export default App;
