// src/services/detectionService.js
import api from './api.js';
import { getMongoUserId } from './userService.js';

// ── saveDetection ─────────────────────────────────
// Call this in DiseaseDetection.jsx → detect() → after setResult(parsed)
//
// Usage:
//   await saveDetection({
//     diseaseLabel: parsed.label,       // e.g. "Tomato___Late_Blight"
//     diseaseName:  parsed.diseaseName, // e.g. "Late Blight"
//     cropName:     parsed.cropName,    // e.g. "Tomato"
//     confidence:   parsed.confidence,  // e.g. 85.5
//     isHealthy:    parsed.isHealthy,   // boolean
//     treatmentAdvice: parsed.treatment || '',
//     imageUrl:     '',                 // optional — add if you store images
//   });
//
export const saveDetection = async (detectionData) => {
  const userId = getMongoUserId();

  if (!userId) {
    console.warn('⚠️ No mongoUserId found — user not synced yet. Detection not saved.');
    return null;
  }

  try {
    // Ensure confidence is in 0-1 range
    const confidence = typeof detectionData.confidence === 'number'
      ? detectionData.confidence > 1 ? detectionData.confidence / 100 : detectionData.confidence
      : 0;

    const res = await api.post('/api/detections', {
      userId,
      ...detectionData,
      confidence,
    });

    console.log('✅ Detection saved:', res.data.detection._id);
    return res.data.detection;
  } catch (err) {
    // Non-blocking — detection result still shows to user even if save fails
    console.error('❌ Failed to save detection:', err.message);
    return null;
  }
};

// ── getUserDetections ─────────────────────────────
// Get all detections for the logged-in user, newest first.
// Use this on your History page.
//
// Usage:
//   const history = await getUserDetections();
//
export const getUserDetections = async () => {
  const userId = getMongoUserId();

  if (!userId) {
    console.warn('⚠️ No mongoUserId found.');
    return [];
  }

  try {
    const res = await api.get(`/api/detections/${userId}`);
    return res.data.detections;
  } catch (err) {
    console.error('❌ Failed to fetch detections:', err.message);
    return [];
  }
};

// ── deleteDetection ───────────────────────────────
// Delete a single detection by its MongoDB _id.
//
// Usage:
//   await deleteDetection(detection._id);
//
export const deleteDetection = async (detectionId) => {
  try {
    await api.delete(`/api/detections/${detectionId}`);
    console.log('✅ Detection deleted:', detectionId);
    return true;
  } catch (err) {
    console.error('❌ Failed to delete detection:', err.message);
    return false;
  }
};
