// server.js
import dotenv from 'dotenv';
dotenv.config();
import express from 'express';
import cors from 'cors';
import fetch from 'node-fetch';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import usersRouter from './routes/users.js';
import detectionsRouter from './routes/detections.js';

const app = express();
const PORT = process.env.PORT || 4000;

// ── Config ────────────────────────────────────────
const AUTH0_DOMAIN    = process.env.AUTH0_DOMAIN    || "dev-zl6sofbd5sbrdbde.us.auth0.com";
const AUTH0_CLIENT_ID = process.env.AUTH0_CLIENT_ID || "yXHFS5b5pvSMFfeu76iCUJCW7kM5ffwH";
const GROQ_API_KEY    = process.env.GROQ_API_KEY;

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ── Connect to MongoDB ────────────────────────────
connectDB();

// ── Middleware ────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(cors({
  origin: true,
  credentials: true,
}));

// ── Health check ──────────────────────────────────
app.get('/health', (_req, res) => {
  const dbState = mongoose.connection.readyState;
  return res.json({
    ok: true,
    dbConnected: dbState === 1,
    dbState,
  });
});

// ── API Routes ────────────────────────────────────
app.use('/api/users', usersRouter);
app.use('/api/detections', detectionsRouter);

// ── SEND OTP ──────────────────────────────────────
app.post('/auth/send-otp', async (req, res) => {
  const { email } = req.body;

  if (!email || !/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({
      error: 'invalid_email',
      error_description: 'A valid email is required.'
    });
  }

  try {
    console.log("📩 Sending OTP to:", email);

    const auth0Res = await fetch(
      `https://${AUTH0_DOMAIN}/passwordless/start`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: AUTH0_CLIENT_ID,
          connection: 'email',
          email: email,
          send: 'code',
        }),
      }
    );

    const data = await auth0Res.json();
    console.log("🔍 Auth0 response:", data);

    if (!auth0Res.ok) {
      console.error('[send-otp] Auth0 error:', data);
      return res.status(auth0Res.status).json(data);
    }

    return res.json({ ok: true, message: 'OTP sent successfully' });

  } catch (err) {
    console.error('[send-otp] Unexpected error:', err);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'Failed to send OTP'
    });
  }
});

// ── VERIFY OTP ────────────────────────────────────
app.post('/auth/verify-otp', async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp || otp.length !== 6) {
    return res.status(400).json({
      error: 'invalid_input',
      error_description: 'Email and 6-digit OTP required'
    });
  }

  try {
    console.log("🔐 Verifying OTP:", otp);

    const auth0Res = await fetch(
      `https://${AUTH0_DOMAIN}/oauth/token`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          grant_type: 'http://auth0.com/oauth/grant-type/passwordless/otp',
          client_id: AUTH0_CLIENT_ID,
          username: email,
          otp: otp,
          realm: 'email',
          scope: 'openid profile email',
        }),
      }
    );

    const data = await auth0Res.json();
    console.log("🔍 Verify response:", data);

    if (!auth0Res.ok) {
      console.error('[verify-otp] Auth0 error:', data);
      return res.status(auth0Res.status).json(data);
    }

    const [, payloadB64] = data.id_token.split('.');
    const profile = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    );

    return res.json({
      ok: true,
      user: {
        name:  profile.name || profile.email,
        email: profile.email,
        sub:   profile.sub,
      }
    });

  } catch (err) {
    console.error('[verify-otp] Unexpected error:', err);
    return res.status(500).json({
      error: 'server_error',
      error_description: 'OTP verification failed'
    });
  }
});

// ── GROQ CHAT ─────────────────────────────────────
app.post('/chat', async (req, res) => {
  const { message, history = [] } = req.body;

  if (!message) {
    return res.status(400).json({
      error: 'invalid_input',
      error_description: 'Message is required.'
    });
  }

  if (!GROQ_API_KEY) {
    console.error('[chat] GROQ_API_KEY not set on server.');
    return res.status(500).json({
      error: 'config_error',
      error_description: 'Groq API key not configured on server.'
    });
  }

  const SYSTEM_PROMPT = `You are KisanGPT, an expert AI farming assistant built into कृषि Mitra — an AI farm manager app for Indian farmers.

YOUR ROLE:
You are a knowledgeable agricultural advisor who helps Indian farmers with practical, actionable advice.

STRICT RULES:
1. GREETINGS FIRST: GREETINGS FIRST: If the message is a greeting (Hi, Hello, Hey, Namaste, Namaskar, Kya haal hai, or any greeting in any language), ALWAYS respond warmly. NEVER treat greetings as off-topic. Reply: "🙏 Namaste! Main KisanGPT hoon — aapka AI farming assistant. Koi bhi kheti se juda sawaal poochhein! 🌱" Match the language of the greeting..
2. ONLY answer questions related to: crops, farming, soil health, fertilizers, pesticides, crop diseases, weather impact on farming, irrigation, seeds, harvesting, post-harvest, government agricultural schemes (PM-KISAN, eNAM, Soil Health Card, PMFBY insurance, Kisan Credit Card), mandi prices, organic farming, or any agriculture-related topic.
3. If asked ANYTHING unrelated (politics, movies, coding, general knowledge etc.), respond ONLY with: "Main sirf kheti-badi ke sawaalon ka jawab de sakta hoon. Koi fasal ya kisan se juda sawaal poochhein! 🌱" but don't apply this rule for greetings, Always reply for greetings with rule 1.
4. LANGUAGE: You MUST detect the language of the CURRENT user message and reply ONLY in that exact same language. Voice inputs may come in Hindi, English, Marathi, or Punjabi — match exactly. If the message is in English, your ENTIRE reply must be in English with no Hindi mixed in. If Hindi → full Hindi. If Marathi → full Marathi. Never mix languages unless the user themselves mixed them..
5. SPECIFICITY: Always give exact, actionable advice. Include specific chemical names with doses (e.g., "Mancozeb 75% WP @ 2g per litre of water"), timing, frequency. Never give vague answers.
6. INDIAN CONTEXT: Always refer to Indian varieties, Indian government schemes, Indian market context. Mention KVK (Krishi Vigyan Kendra), state agriculture departments, ICAR when relevant.
7. FORMAT: Use short paragraphs or bullet points. Keep responses clear and readable on mobile. Do not use markdown headers (##). Use emoji sparingly — only 🌱 🌾 💧 ⚠️ ✅ where genuinely helpful.
8. SAFETY: Never recommend anything that could harm the farmer, environment, or violate Indian law.`;

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.parts?.[0]?.text || m.content || '',
    })),
    { role: 'user', content: message },
  ];

  try {
    const maxRetries = 2;
    let attempt = 0;
    let groqRes;

    do {
      groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages,
          temperature: 0.4,
          max_tokens: 1024,
        }),
      });

      if (groqRes.status === 429 && attempt < maxRetries - 1) {
        const retryAfter = groqRes.headers.get('retry-after') || '1';
        const waitMs = Number(retryAfter) * 1000;
        console.warn(`[chat] Groq rate limited. Waiting ${waitMs}ms... attempt=${attempt + 1}`);
        await sleep(waitMs);
      } else {
        break;
      }

      attempt++;
    } while (attempt < maxRetries);

    if (groqRes.status === 429) {
      const retryAfter = groqRes.headers.get('retry-after') || '1';
      return res.status(429).json({
        error: 'rate_limited',
        error_description: 'Too many requests. Please wait a moment and try again.',
        retry_after_seconds: Number(retryAfter),
      });
    }

    if (!groqRes.ok) {
      const err = await groqRes.json().catch(() => ({}));
      console.error('[chat] Groq error:', err);
      return res.status(groqRes.status).json({
        error: 'provider_error',
        error_description: err?.error?.message || 'Groq API request failed.',
      });
    }

    const data = await groqRes.json();
    const reply = data?.choices?.[0]?.message?.content;

    if (!reply) {
      return res.status(500).json({
        error: 'empty_response',
        error_description: 'No reply received from Groq.'
      });
    }

    return res.json({ ok: true, reply });

  } catch (err) {
    console.error('[chat] Unexpected error:', err);
    return res.status(500).json({
      error: 'server_error',
      error_description: err.message || 'An unexpected error occurred.'
    });
  }
});

// ── START SERVER ──────────────────────────────────
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});