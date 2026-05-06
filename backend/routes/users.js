// routes/users.js
import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// ── POST /api/users/sync ──────────────────────────────────────
// Called right after OTP verify OR Google login succeeds.
// Works with email as the primary key (auth0Id optional).
// Appends a loginHistory entry every time it's called.
router.post('/sync', async (req, res) => {
  const { auth0Id, email, name, phone, state, crop } = req.body;

  if (!email || !name) {
    return res.status(400).json({
      error: 'missing_fields',
      error_description: 'email and name are required.',
    });
  }

  try {
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },        // find by email (works for OTP + Google)
      {
        $set: {
          name,
          ...(auth0Id && { auth0Id }),        // only set auth0Id if provided
          ...(phone    && { phone }),
          ...(state    && { 'location.state': state }),
          ...(crop     && { primaryCrop: crop }),
        },
        $push: {
          loginHistory: { loginAt: new Date() }, // append every login with timestamp
        },
      },
      { new: true, upsert: true }             // create if doesn't exist, return new doc
    );

    return res.status(200).json({
      ok: true,
      _id:  user._id,                         // frontend stores this as mongoId
      user,
    });
  } catch (err) {
    console.error('[users/sync] Error:', err.message);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to sync user.',
    });
  }
});

// ── GET /api/users/:auth0Id ───────────────────────────────────
// Fetch user profile by Auth0 sub
router.get('/auth0/:auth0Id', async (req, res) => {
  try {
    const user = await User.findOne({ auth0Id: req.params.auth0Id });

    if (!user) {
      return res.status(404).json({
        error: 'not_found',
        error_description: 'User not found.',
      });
    }

    return res.json({ ok: true, user });
  } catch (err) {
    console.error('[users/auth0/:id] Error:', err.message);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to fetch user.',
    });
  }
});

// ── GET /api/users/email/:email ───────────────────────────────
// Fetch user profile by email (useful for OTP-based users)
router.get('/email/:email', async (req, res) => {
  try {
    const user = await User.findOne({ email: req.params.email.toLowerCase() });

    if (!user) {
      return res.status(404).json({
        error: 'not_found',
        error_description: 'User not found.',
      });
    }

    return res.json({ ok: true, user });
  } catch (err) {
    console.error('[users/email/:email] Error:', err.message);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to fetch user.',
    });
  }
});

export default router;