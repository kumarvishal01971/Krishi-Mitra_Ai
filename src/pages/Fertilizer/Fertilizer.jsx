// src/pages/Fertilizer/Fertilizer.jsx
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import Card from '../../components/common/Card';
import Btn from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Icon from '../../components/common/Icon';
import { theme } from '../../styles/theme';
import './Fertilizer.css';

const Fertilizer = () => {
  // State management
  const [ph, setPh] = useState(6.5);
  const [crop, setCrop] = useState("Rice");
  const [disease, setDisease] = useState("");
  const [recommendation, setRecommendation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [touched, setTouched] = useState({
    ph: false,
    crop: false,
    disease: false
  });

  // Refs to hold latest values — avoids stale closures in getRecommendation
  // without needing ph/crop/disease in its dependency array (which caused the loop)
  const phRef = useRef(ph);
  const cropRef = useRef(crop);
  const diseaseRef = useRef(disease);

  useEffect(() => { phRef.current = ph; }, [ph]);
  useEffect(() => { cropRef.current = crop; }, [crop]);
  useEffect(() => { diseaseRef.current = disease; }, [disease]);

  // Constants
  const crops = ["Rice", "Wheat", "Tomato", "Cotton", "Maize", "Sugarcane", "Potato"];

  const cropNPK = useMemo(() => ({
    Rice:      { N: 120, P: 60,  K: 60,  unit: "kg/ha" },
    Wheat:     { N: 150, P: 60,  K: 40,  unit: "kg/ha" },
    Tomato:    { N: 180, P: 60,  K: 120, unit: "kg/ha" },
    Cotton:    { N: 120, P: 60,  K: 60,  unit: "kg/ha" },
    Maize:     { N: 180, P: 80,  K: 60,  unit: "kg/ha" },
    Sugarcane: { N: 250, P: 80,  K: 120, unit: "kg/ha" },
    Potato:    { N: 200, P: 100, K: 200, unit: "kg/ha" }
  }), []);

  // Helper functions
  const getSoilType = useCallback((pH) => {
    if (pH < 5.5) return { type: "Acidic Soil",        status: "acidic",   color: theme.alert  };
    if (pH > 7.5) return { type: "Alkaline Soil",      status: "alkaline", color: theme.wheat  };
    return             { type: "Neutral/Ideal Soil",   status: "neutral",  color: theme.sprout };
  }, []);

  const getFertilizerRecommendation = useCallback((pH) => {
    if (pH < 5.5) {
      return {
        chemical: "Agricultural Lime (CaCO₃)",
        organic: "Wood ash, Dolomite",
        notes: "Apply lime 2-3 weeks before sowing. Avoid ammonium sulfate fertilizers. Test soil after 3 months.",
        applicationRate: "2-3 tons/ha for moderate acidity"
      };
    }
    if (pH > 7.5) {
      return {
        chemical: "Elemental Sulfur, Ammonium Sulfate",
        organic: "Peat moss, Pine needle mulch, Compost",
        notes: "Incorporate sulfur 6 months before planting. Add organic matter regularly. Use acid-forming fertilizers.",
        applicationRate: "300-500 kg/ha of sulfur for initial treatment"
      };
    }
    return {
      chemical: "Balanced NPK (20-20-20)",
      organic: "Well-composted farmyard manure, Vermicompost",
      notes: "Ideal pH range. Focus on balanced nutrition based on crop stage. Maintain organic matter.",
      applicationRate: "As per crop requirement"
    };
  }, []);

  const formatNPK = useCallback((npk) => {
    return `N:P:K = ${npk.N}:${npk.P}:${npk.K} ${npk.unit}`;
  }, []);

  const getDiseaseRecommendation = useCallback((diseaseName, pH, cropType) => {
    if (!diseaseName) return null;
    const soilStatus = getSoilType(pH).status;
    return {
      adjustment: `Increase Potassium (K) application by 20-30% to boost immunity`,
      foliar: "Potassium silicate foliar spray (2-3 ml/L water) every 10-14 days",
      organic: "Neem cake application (200-300 kg/ha) for disease suppression",
      notes: `${diseaseName} thrives in ${soilStatus} soil conditions. Maintain proper spacing for air circulation.`
    };
  }, [getSoilType]);

  const getSeverityLevel = useCallback((pH) => {
    if (pH < 4.5 || pH > 9)   return 'critical';
    if (pH < 5.0 || pH > 8.5) return 'high';
    if (pH < 5.5 || pH > 7.5) return 'moderate';
    return 'optimal';
  }, []);

  // ─── FIX: reads values from refs, not from closed-over state ───────────────
  // This means ph/crop/disease are NOT needed in the dependency array,
  // so getRecommendation is stable and won't retrigger the useEffect below.
  const getRecommendation = useCallback(() => {
    const currentPh      = phRef.current;
    const currentCrop    = cropRef.current;
    const currentDisease = diseaseRef.current;

    setLoading(true);
    setError(null);

    setTimeout(() => {
      try {
        const soilInfo      = getSoilType(currentPh);
        const fertilizerInfo = getFertilizerRecommendation(currentPh);
        const npkInfo       = cropNPK[currentCrop];
        const diseaseInfo   = getDiseaseRecommendation(currentDisease, currentPh, currentCrop);
        const severity      = getSeverityLevel(currentPh);

        setRecommendation({
          soilType:  soilInfo.type,
          soilStatus: soilInfo.status,
          soilColor: soilInfo.color,
          ...fertilizerInfo,
          npk:       formatNPK(npkInfo),
          npkValues: npkInfo,
          disease:   diseaseInfo,
          severity,
          ph:        currentPh.toFixed(1),
          crop:      currentCrop
        });
      } catch (err) {
        setError("Failed to generate recommendation. Please try again.");
      } finally {
        setLoading(false);
      }
    }, 800);
  }, [
    getSoilType,
    getFertilizerRecommendation,
    cropNPK,
    formatNPK,
    getDiseaseRecommendation,
    getSeverityLevel
    // ↑ No ph / crop / disease here — we read them from refs above
  ]);

  // ─── FIX: removed `loading` and `getRecommendation` from deps ─────────────
  // Previously, `loading` in deps caused:
  //   slider moves → effect fires → loading=true → effect fires again →
  //   loading=false → effect fires again → infinite loop
  // Now the effect only reruns when `ph` or `touched.ph` genuinely changes.
  useEffect(() => {
    if (!touched.ph) return;

    const debounceTimer = setTimeout(() => {
      getRecommendation();
    }, 500);

    return () => clearTimeout(debounceTimer);
  }, [ph, touched.ph]); // eslint-disable-line react-hooks/exhaustive-deps
  // ^ getRecommendation is intentionally omitted — it's stable via refs

  const handlePhChange = (value) => {
    setPh(value);
    setTouched(prev => ({ ...prev, ph: true }));
  };

  const handleCropChange = (selectedCrop) => {
    setCrop(selectedCrop);
    cropRef.current = selectedCrop; // sync ref immediately so getRecommendation reads new value
    setTouched(prev => ({ ...prev, crop: true }));
    if (recommendation) getRecommendation();
  };

  const handleDiseaseChange = (e) => {
    setDisease(e.target.value);
    setTouched(prev => ({ ...prev, disease: true }));
  };

  const clearRecommendation = () => {
    setRecommendation(null);
    setError(null);
    setDisease("");
    setTouched({ ph: false, crop: false, disease: false });
  };

  const getPhStatusIcon = useCallback(() => {
    const status = getSoilType(ph).status;
    switch (status) {
      case 'acidic':   return '⚠️';
      case 'alkaline': return '⚡';
      default:         return '✅';
    }
  }, [ph, getSoilType]);

  return (
    <div className="fertilizer-container">
      <div className="fertilizer-header">
        <h2 className="fertilizer-title">Fertilizer Recommendation</h2>
        <p className="fertilizer-subtitle">
          pH-based soil analysis with crop-specific fertilizer guidance
        </p>
      </div>

      <div className="fertilizer-grid">
        {/* Input Form Card */}
        <Card className="input-card">
          {/* pH Slider Section */}
          <div className="ph-section">
            <label className="input-label">
              <Icon name="droplet" size={14} color={theme.sage} />
              SOIL pH LEVEL
            </label>
            <div className="ph-value-container">
              <span className={`ph-value ${getSoilType(ph).status}`}>
                {ph.toFixed(1)}
              </span>
              <span className="ph-status">
                {getSoilType(ph).type.split(' ')[0]}
              </span>
              <span className="ph-icon">{getPhStatusIcon()}</span>
            </div>
            <input
              type="range"
              min="3"
              max="10"
              step="0.1"
              value={ph}
              onChange={(e) => handlePhChange(parseFloat(e.target.value))}
              className="ph-slider"
              aria-label="Soil pH level slider"
            />
            <div className="ph-scale">
              <span>Acidic (3)</span>
              <span>Neutral (7)</span>
              <span>Alkaline (10)</span>
            </div>
            {getSeverityLevel(ph) === 'critical' && (
              <div className="warning-message">
                <Icon name="alert" size={12} />
                Critical pH level! Immediate amendment required.
              </div>
            )}
          </div>

          {/* Crop Selection */}
          <div className="input-group">
            <label className="input-label">
              <Icon name="seedling" size={14} color={theme.sage} />
              CROP TYPE
            </label>
            <div className="crop-buttons">
              {crops.map(c => (
                <button
                  key={c}
                  onClick={() => handleCropChange(c)}
                  className={`crop-btn ${crop === c ? 'active' : ''}`}
                  aria-label={`Select ${c}`}
                >
                  <Icon name={getCropIcon(c)} size={12} />
                  {c}
                </button>
              ))}
            </div>
          </div>

          {/* Disease Input */}
          <div className="input-group">
            <label className="input-label">
              <Icon name="bug" size={14} color={theme.sage} />
              DISEASE (if detected)
            </label>
            <input
              value={disease}
              onChange={handleDiseaseChange}
              placeholder="e.g., Late Blight, Leaf Rust, Powdery Mildew..."
              className="disease-input"
              aria-label="Detected disease"
            />
            {disease && (
              <div className="input-hint">
                <Icon name="info" size={12} />
                Disease-specific recommendations will be included
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="action-buttons">
            <Btn
              icon="flask"
              onClick={getRecommendation}
              disabled={loading}
              className="recommend-btn"
              loading={loading}
            >
              {loading ? 'Analyzing...' : 'Get Recommendation'}
            </Btn>

            {recommendation && (
              <button
                onClick={clearRecommendation}
                className="clear-btn"
                aria-label="Clear recommendation"
              >
                <Icon name="refresh" size={14} />
                Clear
              </button>
            )}
          </div>

          {error && (
            <div className="error-message">
              <Icon name="alert" size={16} />
              {error}
            </div>
          )}
        </Card>

        {/* Results Section */}
        <div className="results-section">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Analyzing soil chemistry...</p>
            </div>
          ) : recommendation ? (
            <>
              {/* Soil Type Card */}
              <Card className={`result-card soil-card ${recommendation.soilStatus}`}>
                <Badge className={`soil-badge ${recommendation.soilStatus}`}>
                  {recommendation.soilType}
                </Badge>
                <h3 className="result-title">
                  {recommendation.crop} Recommendations
                </h3>
                <p className="result-npk">{recommendation.npk}</p>
                {recommendation.severity === 'critical' && (
                  <div className="severity-badge critical">
                    <Icon name="alert" size={12} />
                    Critical Condition
                  </div>
                )}
              </Card>

              {/* NPK Breakdown Card */}
              <Card className="info-card npk-card">
                <div className="info-header">
                  <Icon name="chart" size={16} color={theme.wheat} />
                  <span className="info-label">NPK REQUIREMENT</span>
                </div>
                <div className="npk-breakdown">
                  <div className="npk-item">
                    <span className="npk-label">Nitrogen (N)</span>
                    <span className="npk-value">{recommendation.npkValues.N} kg/ha</span>
                    <div className="npk-bar">
                      <div className="npk-fill nitrogen" style={{ width: `${(recommendation.npkValues.N / 300) * 100}%` }}></div>
                    </div>
                  </div>
                  <div className="npk-item">
                    <span className="npk-label">Phosphorus (P)</span>
                    <span className="npk-value">{recommendation.npkValues.P} kg/ha</span>
                    <div className="npk-bar">
                      <div className="npk-fill phosphorus" style={{ width: `${(recommendation.npkValues.P / 300) * 100}%` }}></div>
                    </div>
                  </div>
                  <div className="npk-item">
                    <span className="npk-label">Potassium (K)</span>
                    <span className="npk-value">{recommendation.npkValues.K} kg/ha</span>
                    <div className="npk-bar">
                      <div className="npk-fill potassium" style={{ width: `${(recommendation.npkValues.K / 300) * 100}%` }}></div>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Chemical Fertilizers */}
              <Card className="info-card" style={{ borderLeft: `3px solid ${theme.wheat}` }}>
                <div className="info-header">
                  <Icon name="flask" size={16} color={theme.wheat} />
                  <span className="info-label" style={{ color: theme.wheat }}>
                    CHEMICAL FERTILIZERS
                  </span>
                </div>
                <p className="info-value">{recommendation.chemical}</p>
                {recommendation.applicationRate && (
                  <div className="application-rate">
                    <Icon name="timer" size={12} />
                    {recommendation.applicationRate}
                  </div>
                )}
              </Card>

              {/* Organic Alternatives */}
              <Card className="info-card" style={{ borderLeft: `3px solid ${theme.sprout}` }}>
                <div className="info-header">
                  <Icon name="leaf" size={16} color={theme.sprout} />
                  <span className="info-label" style={{ color: theme.sprout }}>
                    ORGANIC ALTERNATIVES
                  </span>
                </div>
                <p className="info-value">{recommendation.organic}</p>
              </Card>

              {/* Application Notes */}
              <Card className="info-card" style={{ borderLeft: `3px solid ${theme.rain}` }}>
                <div className="info-header">
                  <Icon name="check" size={16} color={theme.rain} />
                  <span className="info-label" style={{ color: theme.rain }}>
                    APPLICATION NOTES
                  </span>
                </div>
                <p className="info-value">{recommendation.notes}</p>
              </Card>

              {/* Disease-Specific Recommendations */}
              {recommendation.disease && (
                <Card className="disease-card">
                  <div className="info-header">
                    <Icon name="bug" size={16} color={theme.alert} />
                    <span className="info-label" style={{ color: theme.alert }}>
                      DISEASE-SPECIFIC ADJUSTMENT
                    </span>
                  </div>
                  <div className="disease-content">
                    <p className="disease-text">
                      Since your crop shows <strong>{disease}</strong> symptoms with{' '}
                      <strong>{recommendation.soilType.toLowerCase()}</strong> (pH {recommendation.ph}):
                    </p>
                    <ul className="disease-list">
                      <li>
                        <Icon name="arrow" size={12} />
                        {recommendation.disease.adjustment}
                      </li>
                      <li>
                        <Icon name="spray" size={12} />
                        {recommendation.disease.foliar}
                      </li>
                      <li>
                        <Icon name="leaf" size={12} />
                        {recommendation.disease.organic}
                      </li>
                    </ul>
                    <div className="disease-note">
                      <Icon name="info" size={12} />
                      {recommendation.disease.notes}
                    </div>
                  </div>
                </Card>
              )}

              {/* Seasonal Tips */}
              <Card className="tips-card">
                <div className="info-header">
                  <Icon name="calendar" size={16} color={theme.sprout} />
                  <span className="info-label">SEASONAL TIPS</span>
                </div>
                <div className="tips-content">
                  <div className="tip-item">
                    <Icon name="sun" size={14} />
                    <span>Apply fertilizers during early morning or late evening</span>
                  </div>
                  <div className="tip-item">
                    <Icon name="water" size={14} />
                    <span>Irrigate immediately after fertilizer application</span>
                  </div>
                  <div className="tip-item">
                    <Icon name="test" size={14} />
                    <span>Test soil every 3-6 months for optimal results</span>
                  </div>
                </div>
              </Card>
            </>
          ) : (
            <Card className="empty-state">
              <div className="empty-icon">
                <Icon name="flask" size={48} color={theme.clay} />
              </div>
              <p className="empty-text">
                Adjust pH and select crop<br />
                to get fertilizer recommendations
              </p>
              <div className="empty-hint">
                <Icon name="arrow" size={12} />
                Start by adjusting the pH slider
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper function to get crop icon
const getCropIcon = (crop) => {
  const icons = {
    Rice:      "🌾",
    Wheat:     "🌾",
    Tomato:    "🍅",
    Cotton:    "🌿",
    Maize:     "🌽",
    Sugarcane: "🎋",
    Potato:    "🥔"
  };
  return icons[crop] || "🌱";
};

export default Fertilizer;