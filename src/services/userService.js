// src/services/userService.js
import api from './api.js';

// ── Wake up Render backend (free tier spins down) ─
export const pingBackend = async () => {
  try {
    await api.get('/health', { timeout: 60000 });
    console.log('✅ Backend is awake');
  } catch {
    console.warn('⚠️ Backend ping failed — may still be waking up');
  }
};

// ── syncUser ──────────────────────────────────────
export const syncUser = async ({ auth0Id, email, name }, retries = 3) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log(`🔄 Syncing user to MongoDB (attempt ${attempt})...`);

      const res = await api.post(
        '/api/users/sync',
        { auth0Id, email, name },
        { timeout: 30000 }   // 30s timeout per attempt
      );

      const mongoUser = res.data.user;

      localStorage.setItem('mongoUserId', mongoUser._id);
      localStorage.setItem('mongoUser', JSON.stringify(mongoUser));

      console.log('✅ User synced to MongoDB:', mongoUser._id);
      return mongoUser;

    } catch (err) {
      const isLast = attempt === retries;
      console.error(
        `❌ Sync attempt ${attempt} failed: ${err.message}`,
        isLast ? '— giving up' : '— retrying in 3s...'
      );
      if (!isLast) await new Promise(r => setTimeout(r, 3000));
    }
  }
  return null;
};

// ── getUserProfile ────────────────────────────────
export const getUserProfile = async (auth0Id) => {
  try {
    const res = await api.get(`/api/users/${auth0Id}`, { timeout: 15000 });
    return res.data.user;
  } catch (err) {
    console.error('❌ Failed to fetch user profile:', err.message);
    return null;
  }
};

// ── getMongoUserId ────────────────────────────────
export const getMongoUserId = () => {
  const direct = localStorage.getItem('mongoUserId');
  if (direct) return direct;

  const stored = localStorage.getItem('krishi_user');
  if (!stored) return null;

  try {
    const parsed = JSON.parse(stored);
    return parsed?.mongoId || null;
  } catch {
    return null;
  }
};