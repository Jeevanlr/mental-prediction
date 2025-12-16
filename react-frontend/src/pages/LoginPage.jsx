/* global webkitSpeechRecognition */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const res = await api.login(email, password);
      if (res.ok) {
        navigate('/symptom-checker');
      } else {
        const data = await res.json();
        setError(data.message || 'Invalid credentials');
      }
    } catch (err) {
      console.error('Login error:', err);
      // More helpful error message for mobile users
      const isMobile = window.Capacitor || window.cordova;
      if (isMobile) {
        setError('Cannot connect to server. Make sure:\n1. Your phone is on the same WiFi network\n2. Flask server is running on your computer\n3. Server IP address is correct');
      } else {
        setError('Error connecting to server. Please check your network connection.');
      }
    }
  };

  return (
    <Layout showChatbot={false}>
      <div className="container">
        <div className="page-intro">
          <h2>Welcome back 👋</h2>
          <p>Log in to continue your personalized wellbeing journey, review recent assessments, and stay connected with your care circle.</p>
          <div className="stat-pill-group">
            <div className="stat-pill">
              <span>Avg. check-in</span>
              <strong>2 mins</strong>
            </div>
            <div className="stat-pill">
              <span>Support access</span>
              <strong>24 × 7</strong>
            </div>
          </div>
        </div>

        <div className="login-card">
          <h2>Access Your Wellness Dashboard</h2>
          {error && <div className="warning-message">{error}</div>}
          <form onSubmit={handleSubmit}>
            <label htmlFor="emailInput">Email address</label>
            <input
              type="email"
              id="emailInput"
              className="input"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="name@email.com"
            />
            <p className="input-hint">Use the email you registered with MindCheck.</p>

            <label htmlFor="passwordInput">Password</label>
            <input
              type="password"
              id="passwordInput"
              className="input"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
            />
            <p className="input-hint">Password is case sensitive.</p>

            <button type="submit" className="btn" style={{ width: '100%', marginTop: '1rem' }}>
              Login
            </button>
          </form>
          <p className="register-link">
            New user? <a href="/register">Create an account</a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default LoginPage;