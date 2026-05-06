// routes/users.js
import express from 'express';
import User from '../models/User.js';

const router = express.Router();

// ── POST /api/users/sync ──────────────────────────
// Called right after OTP verify succeeds on the frontend.
// Creates the user if first time, updates name if they exist.
router.post('/sync', async (req, res) => {
  const { auth0Id, email, name } = req.body;

  if (!auth0Id || !email || !name) {
    return res.status(400).json({
      error: 'missing_fields',
      error_description: 'auth0Id, email and name are required.'
    });
  }

  try {
    const user = await User.findOneAndUpdate(
      { auth0Id },                          // find by Auth0 sub
      { $set: { email, name } },            // update name/email on every login
      { new: true, upsert: true }           // create if doesn't exist, return new doc
    );

    return res.json({ ok: true, user });
  } catch (err) {
    console.error('[users/sync] Error:', err.message);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to sync user.'
    });
  }
});

// ── GET /api/users/:auth0Id ───────────────────────
// Fetch user profile by Auth0 sub
router.get('/:auth0Id', async (req, res) => {
  try {
    const user = await User.findOne({ auth0Id: req.params.auth0Id });

    if (!user) {
      return res.status(404).json({
        error: 'not_found',
        error_description: 'User not found.'
      });
    }

    return res.json({ ok: true, user });
  } catch (err) {
    console.error('[users/:auth0Id] Error:', err.message);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to fetch user.'
    });
  }
});

export default router;
