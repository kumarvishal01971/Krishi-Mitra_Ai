// routes/detections.js
import express from 'express';
import Detection from '../models/Detection.js';
import User from '../models/User.js';

const router = express.Router();

// ── POST /api/detections ──────────────────────────
// Called after HuggingFace ResNet50 returns a result.
// Expects mongoUserId (the _id returned from /api/users/sync).
router.post('/', async (req, res) => {
  const {
    userId,         // MongoDB _id from syncUser response
    diseaseLabel,   // raw model label e.g. "Tomato___Late_Blight"
    diseaseName,    // human readable e.g. "Late Blight"
    cropName,       // e.g. "Tomato"
    confidence,     // e.g. 85.5
    isHealthy,      // boolean
    treatmentAdvice,
    imageUrl,
    location,
  } = req.body;

  if (!diseaseLabel || !diseaseName || !cropName || confidence == null || isHealthy == null) {
    console.error('[detections/POST] Invalid payload:', req.body);
    return res.status(400).json({
      error: 'missing_fields',
      error_description: 'diseaseLabel, diseaseName, cropName, confidence and isHealthy are required.'
    });
  }

  try {
    const detection = await Detection.create({
      userId,
      diseaseLabel,
      diseaseName,
      cropName,
      confidence,
      isHealthy,
      treatmentAdvice: treatmentAdvice || '',
      imageUrl: imageUrl || '',
      location: location || {},
    });

    return res.status(201).json({ ok: true, detection });
  } catch (err) {
    console.error('[detections/POST] Error:', err.message);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to save detection.'
    });
  }
});

// ── GET /api/detections/:userId ───────────────────
// Get all detections for a user, newest first.
// :userId is the MongoDB _id (not auth0Id)
router.get('/:userId', async (req, res) => {
  try {
    const detections = await Detection
      .find({ userId: req.params.userId })
      .sort({ createdAt: -1 });   // newest first

    return res.json({ ok: true, detections });
  } catch (err) {
    console.error('[detections/:userId] Error:', err.message);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to fetch detections.'
    });
  }
});

// ── DELETE /api/detections/:id ────────────────────
// Delete a single detection by its _id
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Detection.findByIdAndDelete(req.params.id);

    if (!deleted) {
      return res.status(404).json({
        error: 'not_found',
        error_description: 'Detection not found.'
      });
    }

    return res.json({ ok: true, message: 'Detection deleted.' });
  } catch (err) {
    console.error('[detections/DELETE] Error:', err.message);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to delete detection.'
    });
  }
});

export default router;
