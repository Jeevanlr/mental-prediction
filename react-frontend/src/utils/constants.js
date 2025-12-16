// Backend server base URL
// In development, you can use your local server, e.g. "http://localhost:5000"
// In production (Render), replace this with your Render backend URL, e.g. "https://your-backend.onrender.com"
export const API_BASE_URL =
  process.env.REACT_APP_API_BASE_URL || "http://localhost:5000";
