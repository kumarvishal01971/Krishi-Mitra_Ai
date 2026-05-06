// src/services/userService.js
import api from './api.js';

// ── syncUser ──────────────────────────────────────
// Call this immediately after OTP verify succeeds.
// In AuthPage.jsx → handleOtpVerified() → add syncUser(user) call.
//
// Usage:
//   const mongoUser = await syncUser({ auth0Id: user.sub, email: user.email, name: user.name });
//   localStorage.setItem('mongoUserId', mongoUser._id);
//
export const syncUser = async ({ auth0Id, email, name }) => {
  try {
    const res = await api.post('/api/users/sync', { auth0Id, email, name });
    const mongoUser = res.data.user;

    // Store MongoDB _id in localStorage — needed for saving detections
    localStorage.setItem('mongoUserId', mongoUser._id);
    localStorage.setItem('mongoUser', JSON.stringify(mongoUser));

    console.log('✅ User synced to MongoDB:', mongoUser._id);
    return mongoUser;
  } catch (err) {
    // Non-blocking — auth still works even if sync fails
    console.error('❌ Failed to sync user to MongoDB:', err.message);
    return null;
  }
};

// ── getUserProfile ────────────────────────────────
// Fetch full user profile from MongoDB by Auth0 sub.
//
// Usage:
//   const profile = await getUserProfile(user.sub);
//
export const getUserProfile = async (auth0Id) => {
  try {
    const res = await api.get(`/api/users/${auth0Id}`);
    return res.data.user;
  } catch (err) {
    console.error('❌ Failed to fetch user profile:', err.message);
    return null;
  }
};

// ── getMongoUserId ────────────────────────────────
// Helper to get stored MongoDB _id from localStorage.
// Use this wherever you need userId for detection calls.
//
export const getMongoUserId = () => localStorage.getItem('mongoUserId');
