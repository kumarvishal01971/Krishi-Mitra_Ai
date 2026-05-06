// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://krishi-mitra-ai-80gs.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s — accounts for Render free tier cold starts
});

export default api;