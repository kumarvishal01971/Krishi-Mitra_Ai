// src/pages/CropRecommend/CropRecommend.jsx
import React, { useState, useCallback } from 'react';
import Card from '../../components/common/Card';
import Btn from '../../components/common/Button';
import Badge from '../../components/common/Badge';
import Icon from '../../components/common/Icon';
import { theme } from '../../styles/theme';
import './CropRecommend.css';

const FIELDS = [
  { id: 'N',           label: 'Nitrogen',    unit: 'N',    section: 'nutrients', placeholder: '90',  min: 0,   max: 300,  step: 1   },
  { id: 'P',           label: 'Phosphorus',  unit: 'P',    section: 'nutrients', placeholder: '42',  min: 0,   max: 200,  step: 1   },
  { id: 'K',           label: 'Potassium',   unit: 'K',    section: 'nutrients', placeholder: '43',  min: 0,   max: 300,  step: 1   },
  { id: 'ph',          label: 'Soil pH',     unit: '0–14', section: 'nutrients', placeholder: '6.5', min: 0,   max: 14,   step: 0.1 },
  { id: 'temperature', label: 'Temperature', unit: '°C',   section: 'climate',   placeholder: '25',  min: -10, max: 60,   step: 0.1 },
  { id: 'humidity',    label: 'Humidity',    unit: '%',    section: 'climate',   placeholder: '80',  min: 0,   max: 100,  step: 1   },
  { id: 'rainfall',    label: 'Rainfall',    unit: 'mm',   section: 'climate',   placeholder: '202', min: 0,   max: 3000, step: 1   },
];

const CROP_ICONS = {
  rice: '🌾', wheat: '🌾', maize: '🌽', chickpea: '🫘', kidneybeans: '🫘',
  pigeonpeas: '🫘', mothbeans: '🫘', mungbean: '🫘', blackgram: '🫘',
  lentil: '🫘', pomegranate: '🍎', banana: '🍌', mango: '🥭', grapes: '🍇',
  watermelon: '🍉', muskmelon: '🍈', apple: '🍎', orange: '🍊', papaya: '🍈',
  coconut: '🥥', cotton: '🌿', jute: '🌿', coffee: '☕',
};

const cropIcon = (name = '') => CROP_ICONS[name.toLowerCase()] ?? '🌱';

const CropRecommend = ({ onPredict, onClear, loading, result, apiError }) => {
  const [values, setValues] = useState({});
  const [errors, setErrors] = useState({});

  const handleChange = useCallback((id, val) => {
    setValues(prev => ({ ...prev, [id]: val }));
    setErrors(prev => ({ ...prev, [id]: false }));
  }, []);

  const validate = useCallback(() => {
    const newErrors = {};
    FIELDS.forEach(({ id }) => {
      if (values[id] === undefined || values[id] === '') newErrors[id] = true;
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }, [values]);

  const handlePredict = useCallback(() => {
    if (!validate()) return;
    const payload = {};
    FIELDS.forEach(({ id }) => { payload[id] = parseFloat(values[id]); });
    onPredict(payload);
  }, [values, validate, onPredict]);

  const handleClear = useCallback(() => {
    setValues({});
    setErrors({});
    onClear();
  }, [onClear]);

  const nutrientFields = FIELDS.filter(f => f.section === 'nutrients');
  const climateFields  = FIELDS.filter(f => f.section === 'climate');
  const isDirty = Object.keys(values).length > 0;

  return (
    <div className="cr-container">
      <div className="cr-header">
        <h2 className="cr-title">Crop Recommendation</h2>
        <p className="cr-subtitle">AI-powered crop advisor · 99.36% accuracy</p>
      </div>
      <div className="cr-grid">
        <Card className="cr-input-card">
          <div className="cr-section-label">
            <Icon name="droplet" size={13} color={theme.sage} /> SOIL NUTRIENTS
          </div>
          <div className="cr-fields-grid four">
            {nutrientFields.map(f => (
              <FieldInput key={f.id} field={f} value={values[f.id] ?? ''} hasError={!!errors[f.id]} onChange={handleChange} />
            ))}
          </div>
          <div className="cr-divider" />
          <div className="cr-section-label">
            <Icon name="sun" size={13} color={theme.sage} /> CLIMATE CONDITIONS
          </div>
          <div className="cr-fields-grid three">
            {climateFields.map(f => (
              <FieldInput key={f.id} field={f} value={values[f.id] ?? ''} hasError={!!errors[f.id]} onChange={handleChange} />
            ))}
          </div>
          <div className="cr-actions">
            <Btn icon="seedling" onClick={handlePredict} disabled={loading}>
              {loading ? 'Analyzing…' : 'Recommend Crop'}
            </Btn>
            {(result || apiError || isDirty) && (
              <button className="cr-clear-btn" onClick={handleClear}>
                <Icon name="refresh" size={13} /> Clear
              </button>
            )}
          </div>
        </Card>

        <div className="cr-results-section">
          {!result && !apiError && !loading && (
            <Card className="cr-empty-state">
              <div className="cr-empty-icon"><Icon name="seedling" size={48} color={theme.clay} /></div>
              <p className="cr-empty-text">Enter soil and climate values<br />to get your crop recommendation</p>
              <div className="cr-empty-hint"><Icon name="arrow" size={12} /> Fill in all fields to begin</div>
            </Card>
          )}
          {loading && (
            <Card className="cr-empty-state">
              <div className="cr-loading-ring" />
              <p className="cr-empty-text">Analyzing your data…</p>
            </Card>
          )}
          {apiError && (
            <Card className="cr-error-card">
              <div className="info-header">
                <Icon name="alert" size={16} color={theme.alert} />
                <span className="info-label" style={{ color: theme.alert }}>API ERROR</span>
              </div>
              <p className="cr-error-text">{apiError}</p>
            </Card>
          )}
          {result && (
            <>
              <Card className="cr-result-hero">
                <Badge className="cr-hero-badge">AI Recommendation</Badge>
                <div className="cr-hero-icon">{cropIcon(result.crop)}</div>
                <h3 className="cr-hero-crop">{result.crop.charAt(0).toUpperCase() + result.crop.slice(1)}</h3>
                <p className="cr-hero-sub">Best crop for your conditions</p>
              </Card>
              <Card className="cr-summary-card">
                <div className="info-header">
                  <Icon name="chart" size={16} color={theme.wheat} />
                  <span className="info-label">INPUT SUMMARY</span>
                </div>
                <div className="cr-summary-grid">
                  {FIELDS.map(f => (
                    <div key={f.id} className="cr-summary-item">
                      <span className="cr-summary-label">{f.label}</span>
                      <span className="cr-summary-value">{values[f.id]} <span className="cr-summary-unit">{f.unit}</span></span>
                    </div>
                  ))}
                </div>
              </Card>
              <Card className="cr-tips-card">
                <div className="info-header">
                  <Icon name="info" size={16} color={theme.sprout} />
                  <span className="info-label">GROWING TIPS</span>
                </div>
                <div className="tips-content">
                  <div className="tip-item"><Icon name="sun" size={14} /><span>Verify with a local agronomist</span></div>
                  <div className="tip-item"><Icon name="water" size={14} /><span>Conduct a full soil test before sowing</span></div>
                  <div className="tip-item"><Icon name="test" size={14} /><span>Check seasonal suitability for your region</span></div>
                </div>
              </Card>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const FieldInput = ({ field, value, hasError, onChange }) => (
  <div className="cr-field">
    <label className="cr-field-label" htmlFor={`cr-${field.id}`}>
      {field.label}<span className="cr-field-unit">{field.unit}</span>
    </label>
    <input
      id={`cr-${field.id}`} type="number" min={field.min} max={field.max}
      step={field.step} value={value} placeholder={field.placeholder}
      onChange={e => onChange(field.id, e.target.value)}
      className={`cr-field-input${hasError ? ' cr-field-input--error' : ''}`}
    />
    {hasError && <span className="cr-field-error">Required</span>}
  </div>
);

export default CropRecommend;
