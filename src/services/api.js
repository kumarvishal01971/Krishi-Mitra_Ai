// src/services/api.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'https://krishi-mitra-ai-80gs.onrender.com',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30s — accounts for Render free tier cold starts
});

export const predictCrop = async (payload) => {
  try {
    const res = await api.post('/api/crop-recommend', payload);
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    const shouldFallback = !err.response || [404, 502, 503, 504].includes(status);

    if (!shouldFallback) {
      throw err;
    }

    try {
      const fallbackRes = await fetch('https://kumarvishal01971-crop-recommendation.hf.space/predict', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!fallbackRes.ok) {
        const errorText = await fallbackRes.text();
        throw new Error(`Fallback failed (${fallbackRes.status}): ${errorText}`);
      }

      return await fallbackRes.json();
    } catch (fallbackError) {
      const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
      throw new Error(
        err.response?.data?.error_description || err.message || 'Prediction failed. Try again.'
        + ` Fallback attempt also failed: ${fallbackMsg}`
      );
    }
  }
};

export default api;