// src/pages/Disease/DiseaseDetection.jsx
import React, { useState, useRef, useEffect } from 'react';
import { Client } from "@gradio/client";
import Card from '../../components/common/Card';
import Btn from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import UploadBox from './UploadBox';
import DiagnosisResult from './DiagnosisResult';
import { theme } from '../../styles/theme';
import { saveDetection } from '../../services/detectionService';

const DiseaseDetection = () => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [clientReady, setClientReady] = useState(false);
  const [clientError, setClientError] = useState(false);
  const [syncError, setSyncError] = useState(null); // for non-fatal DB errors
  const fileRef = useRef();
  const clientRef = useRef(null);

  // ── Connect to Gradio model once on mount ──────────────────
  useEffect(() => {
    Client.connect("sanjaychaurasia1/krishimitra-ai", {
      hf_token: import.meta.env.VITE_HF_TOKEN,
    })
      .then((c) => {
        clientRef.current = c;
        setClientReady(true);
      })
      .catch((err) => {
        console.error("Failed to connect to model:", err);
        setClientError(true);
      });
  }, []);

  // ── File handler with validation ───────────────────────────
  const handleFile = (f) => {
    if (!f) return;
    if (!f.type.startsWith('image/')) {
      setResult({ error: 'Please upload a valid image file (JPG, PNG, WEBP)' });
      return;
    }
    setFile(f);
    setResult(null);
    setSyncError(null);
    const reader = new FileReader();
    reader.onload = (e) => setPreview(e.target.result);
    reader.readAsDataURL(f);
  };

  const formatDiseaseName = (name) => {
    if (!name) return 'Unknown';
    return name
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  };

  const extractConfidence = (confidenceObj) => {
    if (!confidenceObj || typeof confidenceObj !== 'object') return 0;
    return Math.max(...Object.values(confidenceObj)) / 100;
  };

  const getSeverityLevel = (confidence) => {
    if (confidence > 0.85) return 'Critical';
    if (confidence > 0.7)  return 'High';
    if (confidence > 0.5)  return 'Moderate';
    return 'Low';
  };

  const parseMarkdownResponse = (raw) => {
    const get = (key) => {
      const rx = new RegExp(`\\*\\*${key}:\\*\\*\\s*([^*\n]+)`, 'i');
      const m = raw.match(rx);
      return m ? m[1].trim() : null;
    };

    const getSection = (key) => {
      const rx = new RegExp(`###\\s*${key}([\\s\\S]*?)(?=###|$)`, 'i');
      const m = raw.match(rx);
      if (!m) return [];
      return m[1]
        .split('\n')
        .map(l => l.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean);
    };

    const diseaseName =
      raw.split('**')[0].replace(/^#+\s*/, '').trim() ||
      get('disease') ||
      'Unknown';

    return {
      disease:     formatDiseaseName(diseaseName),
      plant:       get('plant'),
      severity:    get('severity'),
      description: getSection('description').join(' '),
      symptoms:    getSection('symptoms'),
      treatment:   getSection('treatment'),
      prevention:  getSection('prevention'),
    };
  };

  // ── Save detection to MongoDB ──────────────────────────────
  const saveDetectionToDb = async ({ parsed, confidence }) => {
    const result = await saveDetection({
      diseaseLabel: parsed.disease,
      diseaseName:  parsed.disease,
      cropName:     parsed.plant,
      confidence:   confidence,
      isHealthy:    parsed.disease?.toLowerCase().includes('healthy') || false,
      treatmentAdvice: parsed.treatment || '',
    });

    if (!result.success) {
      if (result.reason === 'no_user') {
        setSyncError('⚠️ Detection saved locally but not synced to server. Please log in.');
      } else {
        console.error('❌ Detection save failed:', result.error || result);
        const serverMessage = result.error?.data?.error_description || result.error?.message;
        setSyncError(
          serverMessage
            ? `⚠️ Detection sync failed: ${serverMessage}`
            : 'Could not reach server. Detection not saved.'
        );
      }
      return;
    }

    console.log('✅ Detection saved to MongoDB:', result.detection._id);
  };

  // ── Main analysis function ─────────────────────────────────
  const detect = async () => {
    if (!file || !clientRef.current) return;
    setLoading(true);
    setResult(null);
    setSyncError(null);

    try {
      const response = await clientRef.current.predict("/predict", {
        image: file,
      });

      console.log('API Response:', response.data);

      const [diagnosis, alternatives, confidenceData] = response.data;

      const parsed = parseMarkdownResponse(diagnosis);
      const confidence = extractConfidence(confidenceData);

      const finalResult = {
        ...parsed,
        confidence,
        severity: parsed.severity
          ? parsed.severity.charAt(0).toUpperCase() + parsed.severity.slice(1).toLowerCase()
          : getSeverityLevel(confidence),
        alternatives: (() => {
          if (!alternatives || typeof alternatives !== 'object') return [];
          return Object.entries(alternatives)
            .map(([name, conf]) => ({
              name: formatDiseaseName(name),
              confidence: (conf / 100).toFixed(2),
            }))
            .sort((a, b) => b.confidence - a.confidence)
            .slice(0, 3);
        })(),
      };

      setResult(finalResult);

      // ── Save to MongoDB (non-blocking, non-fatal) ──
      await saveDetectionToDb({ parsed, confidence });

    } catch (err) {
      console.error('Analysis error:', err);
      setResult({ error: err.message || "Failed to analyze image. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>

      {/* ── Top bar: badges + stats ── */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24, flexWrap: "wrap" }}>

        <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
          {/* ResNet50 badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 12.5, fontWeight: 500, color: "#1A4D2E",
            background: "#e8f5e9", border: "0.5px solid rgba(45,122,63,0.35)",
            borderRadius: 20, padding: "4px 10px",
          }}>
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#2D7A3F", display: "inline-block" }} />
            ResNet50 · 38 classes
          </div>

          {/* Model ready / connecting / error badge */}
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 5,
            fontSize: 12.5, fontWeight: 500,
            color: clientError ? "#E24B4A" : clientReady ? "#2D7A3F" : theme.mist,
            background: clientError ? "rgba(226,75,74,0.08)" : clientReady ? "rgba(45,122,63,0.08)" : `${theme.earth}11`,
            border: `0.5px solid ${clientError ? "rgba(226,75,74,0.35)" : clientReady ? "rgba(45,122,63,0.35)" : theme.earth + "44"}`,
            borderRadius: 20, padding: "4px 10px",
            opacity: clientReady ? 1 : 0.7,
            transition: "all 0.3s ease",
          }}>
            <span style={{
              width: 6, height: 6, borderRadius: "50%",
              background: clientError ? "#E24B4A" : clientReady ? "#2D7A3F" : "#aaa",
              display: "inline-block",
            }} />
            {clientError ? "Model unavailable" : clientReady ? "Model ready" : "Connecting..."}
          </div>
        </div>

        {/* Divider */}
        <div style={{ width: 1, height: 28, background: `${theme.earth}44`, flexShrink: 0 }} />

        {/* Stats */}
        <div style={{ display: "flex", gap: 8, flex: 1 }}>
          {[
            { num: "38",   label: "Disease classes" },
            { num: "95%",  label: "Accuracy" },
            { num: "14",   label: "Crop types" },
            { num: "87k+", label: "Training images" },
          ].map(({ num, label }) => (
            <div key={label} style={{
              background: `${theme.earth}22`,
              borderRadius: 8,
              padding: "6px 12px",
              textAlign: "center",
              border: `1.5px solid ${theme.earth}44`,
              flex: 1,
            }}>
              <div style={{ fontSize: 20, fontWeight: 700, color: "#2D7A3F", lineHeight: 1.1 }}>{num}</div>
              <div style={{ fontSize: 10, color: theme.mist, marginTop: 2, whiteSpace: "nowrap" }}>{label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Non-fatal DB sync warning ── */}
      {syncError && (
        <div style={{
          background: 'rgba(251,191,36,0.08)',
          border: '1px solid rgba(251,191,36,0.3)',
          borderRadius: 10, padding: '8px 14px', marginBottom: 16,
          color: '#fbbf24', fontSize: 12, display: 'flex', alignItems: 'center', gap: 8,
          fontFamily: "'Poppins', sans-serif",
        }}>
          <span>⚠</span> {syncError}
        </div>
      )}

      {/* ── Main two-column layout ── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
        <div>
          <h2 style={{ color: theme.wheat, fontFamily: "'Playfair Display', serif", fontSize: 28, marginBottom: 8, marginTop: 0 }}>
            Plant Disease Detection
          </h2>
          <p style={{ color: theme.mist, marginBottom: 24, opacity: 0.8, fontSize: 14 }}>
            Upload a photo of your plant leaf. Our Keras AI model will analyze and diagnose diseases instantly.
          </p>

          <UploadBox
            drag={drag}
            setDrag={setDrag}
            preview={preview}
            handleFile={handleFile}
            fileRef={fileRef}
          />

          {/* File size info */}
          {file && (
            <p style={{ color: theme.mist, fontSize: 11, opacity: 0.5, marginTop: 6, marginBottom: 0 }}>
              {file.name} · {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          )}

          <div style={{ display: "flex", gap: 12, marginTop: 16 }}>
            <Btn
              icon="camera"
              onClick={detect}
              loading={loading}
              disabled={!file || !clientReady || clientError}
              style={{ background: `linear-gradient(135deg, #1A4D2E, #2D7A3F)` }}
            >
              {loading ? "Analyzing..." : "Analyze Plant"}
            </Btn>
            {preview && (
              <Btn variant="ghost" onClick={() => { setFile(null); setPreview(null); setResult(null); setSyncError(null); }}>
                Clear
              </Btn>
            )}
          </div>
        </div>

        <div style={{ marginTop: result ? 40 : 0 }}>
          {!result ? (
            <Card style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
              <div style={{ padding: 24, borderRadius: "50%", background: `${theme.earth}33` }}>
                <Icon name="leaf" size={40} color={theme.clay} />
              </div>
              <p style={{ color: theme.mist, opacity: 0.6, textAlign: "center" }}>
                Upload a plant image to see<br />AI diagnosis results here
              </p>
            </Card>
          ) : result.error ? (
            <Card>
              <p style={{ color: "#E24B4A", marginBottom: 0, fontSize: 13 }}>{result.error}</p>
            </Card>
          ) : (
            <Card>
              <DiagnosisResult result={result} />
            </Card>
          )}
        </div>
      </div>

    </div>
  );
};

export default DiseaseDetection;