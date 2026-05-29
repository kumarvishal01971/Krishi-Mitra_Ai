import React, { useState } from 'react';
import CropRecommend from '../CropRecommend/CropRecommend';
import Card from '../../components/common/Card';
import Btn from '../../components/common/Button';
import Icon from '../../components/common/Icon';
import { theme } from '../../styles/theme';
import api from '../../services/api';
import './CropAdvisory.css';

const CropAdvisory = ({ setActive }) => {
  const [result, setResult]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [apiError, setApiError] = useState(null);

  const handlePredict = async (payload) => {
    setLoading(true);
    setApiError(null);
    try {
      const res = await api.post('/api/crop-recommend', payload);
      setResult(res.data);
    } catch (err) {
      setApiError(err.response?.data?.error_description || 'Prediction failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const navigate = (page) => {
    if (typeof setActive === 'function') {
      setActive(page);
    }
  };

  return (
    <div className="crop-advisory-page">
      <div className="crop-advisory-intro">
        <div>
          <p className="crop-advisory-eyebrow">Crop Advisory</p>
          <h1 className="crop-advisory-headline">Weather & Fertilizer in one place</h1>
          <p className="crop-advisory-copy">
            Get quick access to weather alerts and fertilizer guidance while using the crop recommendation tool.
          </p>
        </div>
      </div>

      <div className="advisory-quick-grid">
        <Card className="advisory-card" style={{ minHeight: 240 }}>
          <div className="advisory-card-header">
            <div>
              <p className="advisory-card-label">Weather Alerts</p>
              <h2>Real-time farm weather</h2>
            </div>
            <Icon name="cloud" size={30} color={theme.wheat} />
          </div>
          <p className="advisory-card-text">
            View local weather conditions, forecast risk alerts, and farming recommendations for irrigation, spraying, and crop protection.
          </p>
          <div className="advisory-card-actions">
            <Btn onClick={() => navigate('weather')} icon="sun" variant="secondary">
              Open Weather
            </Btn>
          </div>
        </Card>

        <Card className="advisory-card" style={{ minHeight: 240 }}>
          <div className="advisory-card-header">
            <div>
              <p className="advisory-card-label">Fertilizer Guide</p>
              <h2>Smart NPK advice</h2>
            </div>
            <Icon name="seedling" size={30} color={theme.leaf} />
          </div>
          <p className="advisory-card-text">
            Use soil pH and crop insights to get balanced fertilizer recommendations and avoid over-application.
          </p>
          <div className="advisory-card-actions">
            <Btn onClick={() => navigate('fertilizer')} icon="leaf" variant="secondary">
              Open Fertilizer
            </Btn>
          </div>
        </Card>
      </div>

      <CropRecommend
        onPredict={handlePredict}
        onClear={() => { setResult(null); setApiError(null); }}
        loading={loading}
        result={result}
        apiError={apiError}
      />
    </div>
  );
};

export default CropAdvisory;
