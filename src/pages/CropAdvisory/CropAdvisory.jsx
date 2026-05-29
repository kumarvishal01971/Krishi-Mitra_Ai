import React, { useState } from 'react';
import CropRecommend from '../CropRecommend/CropRecommend';
import api from '../../services/api';

const CropAdvisory = () => {
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

  return (
    <CropRecommend
      onPredict={handlePredict}
      onClear={() => { setResult(null); setApiError(null); }}
      loading={loading}
      result={result}
      apiError={apiError}
    />
  );
};

export default CropAdvisory;
