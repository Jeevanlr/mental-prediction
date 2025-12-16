/* global webkitSpeechRecognition */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Layout from '../components/Layout';
import { api } from '../services/api';

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    dob: '',
    email: '',
    password: '',
    phone: '',
    doctor_name: '',
    doctor_email: '',
    doctor_phone: '',
    relative1_name: '',
    relative1_email: '',
    relative1_phone: '',
    relative2_name: '',
    relative2_email: '',
    relative2_phone: ''
  });
  const [warning, setWarning] = useState('');
  const [success, setSuccess] = useState('');
  const navigate = useNavigate();

  const calculateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setWarning('');
    setSuccess('');

    if (!formData.dob) {
      setWarning('Please enter your Date of Birth.');
      return;
    }
    if (calculateAge(formData.dob) < 14) {
      setWarning('Warning: Registration requires users to be 14 years of age or older. Please refer a parent or guardian.');
      return;
    }

    try {
      const data = await api.register(formData);
      if (data.message === 'Registration successful!') {
        setSuccess(data.message);
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setWarning(data.message || 'Registration failed.');
      }
    } catch {
      setWarning('Error connecting to server.');
    }
  };

  return (
    <Layout showChatbot={false}>
      <div className="container">
        <div className="page-intro">
          <h2>Create your MindCheck profile</h2>
          <p>Provide a few personal and emergency details so our care team can keep you supported. You can update this information anytime from your dashboard.</p>
          <small>🔒 Your data is encrypted and shared only with trusted contacts.</small>
        </div>

        <div className="register-card">
          <h2>New User Registration</h2>
          {warning && <div className="warning-message">{warning}</div>}
          {success && <div className="success-message">{success}</div>}
          
          <form onSubmit={handleSubmit}>
            <div className="info-banner">
              ✅ Tip: Only the fields marked as optional can be skipped. Emergency contacts help us notify someone you trust when you request support.
            </div>

            <div className="section-heading">
              <h3>User Info</h3>
              <span>Required</span>
            </div>
            <div className="form-group">
              <div className="form-field">
                <label htmlFor="nameInput">Full Name:</label>
                <input type="text" id="nameInput" name="name" className="input" value={formData.name} onChange={handleChange} placeholder="Name" required />
                <p className="input-hint">Use the name you’d like clinicians to address you by.</p>
              </div>
              <div className="form-field">
                <label htmlFor="dobInput">Date of Birth:</label>
                <input type="date" id="dobInput" name="dob" className="input" value={formData.dob} onChange={handleChange} required />
                <p className="input-hint">You must be at least 14 years old to register.</p>
              </div>
            </div>
            <div className="form-group">
              <div className="form-field">
                <label htmlFor="emailInput">Email:</label>
                <input type="email" id="emailInput" name="email" className="input" value={formData.email} onChange={handleChange} placeholder="Email" required />
                <p className="input-hint">This email is used for login and wellbeing updates.</p>
              </div>
              <div className="form-field">
                <label htmlFor="passwordInput">Password:</label>
                <input type="password" id="passwordInput" name="password" className="input" value={formData.password} onChange={handleChange} placeholder="Password" required />
                <p className="input-hint">Min 8 characters with letters & numbers recommended.</p>
              </div>
            </div>
            <div className="form-group">
              <div className="form-field" style={{ flex: '1 1 100%' }}>
                <label htmlFor="phoneInput">Phone:</label>
                <input type="tel" id="phoneInput" name="phone" className="input" value={formData.phone} onChange={handleChange} placeholder="Phone" required />
                <p className="input-hint">Used for SMS alerts when you opt-in for reminders.</p>
              </div>
            </div>

            <div className="section-heading">
              <h3>Doctor Info</h3>
              <span>Optional but helpful</span>
            </div>
            <div className="form-group">
              <div className="form-field">
                <label htmlFor="doctorNameInput">Doctor Name:</label>
                <input type="text" id="doctorNameInput" name="doctor_name" className="input" value={formData.doctor_name} onChange={handleChange} placeholder="Doctor Name" />
              </div>
              <div className="form-field">
                <label htmlFor="doctorEmailInput">Doctor Email:</label>
                <input type="email" id="doctorEmailInput" name="doctor_email" className="input" value={formData.doctor_email} onChange={handleChange} placeholder="Doctor Email" />
              </div>
            </div>
            <div className="form-group">
              <div className="form-field" style={{ flex: '1 1 100%' }}>
                <label htmlFor="doctorPhoneInput">Doctor Phone:</label>
                <input type="tel" id="doctorPhoneInput" name="doctor_phone" className="input" value={formData.doctor_phone} onChange={handleChange} placeholder="Doctor Phone" />
              </div>
            </div>

            <div className="section-heading">
              <h3>Emergency Contact 1</h3>
              <span>Primary relative</span>
            </div>
            <div className="form-group">
              <div className="form-field">
                <label htmlFor="relative1NameInput">Name:</label>
                <input type="text" id="relative1NameInput" name="relative1_name" className="input" value={formData.relative1_name} onChange={handleChange} placeholder="Relative 1 Name" />
              </div>
              <div className="form-field">
                <label htmlFor="relative1EmailInput">Email:</label>
                <input type="email" id="relative1EmailInput" name="relative1_email" className="input" value={formData.relative1_email} onChange={handleChange} placeholder="Relative 1 Email" />
              </div>
            </div>
            <div className="form-group">
              <div className="form-field" style={{ flex: '1 1 100%' }}>
                <label htmlFor="relative1PhoneInput">Phone:</label>
                <input type="tel" id="relative1PhoneInput" name="relative1_phone" className="input" value={formData.relative1_phone} onChange={handleChange} placeholder="Relative 1 Phone" />
              </div>
            </div>

            <div className="section-heading">
              <h3>Emergency Contact 2</h3>
              <span>Secondary relative</span>
            </div>
            <div className="form-group">
              <div className="form-field">
                <label htmlFor="relative2NameInput">Name:</label>
                <input type="text" id="relative2NameInput" name="relative2_name" className="input" value={formData.relative2_name} onChange={handleChange} placeholder="Relative 2 Name" />
              </div>
              <div className="form-field">
                <label htmlFor="relative2EmailInput">Email:</label>
                <input type="email" id="relative2EmailInput" name="relative2_email" className="input" value={formData.relative2_email} onChange={handleChange} placeholder="Relative 2 Email" />
              </div>
            </div>
            <div className="form-group">
              <div className="form-field" style={{ flex: '1 1 100%' }}>
                <label htmlFor="relative2PhoneInput">Phone:</label>
                <input type="tel" id="relative2PhoneInput" name="relative2_phone" className="input" value={formData.relative2_phone} onChange={handleChange} placeholder="Relative 2 Phone" />
              </div>
            </div>

            <button type="submit" className="btn">Register Account</button>
          </form>

          <p className="login-link">
            Already have an account? <a href="/login">Login here</a>
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default RegisterPage;