// models/Detection.js
import mongoose from 'mongoose';

const detectionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    // Raw label from ResNet50 e.g. "Tomato___Late_Blight"
    diseaseLabel: {
      type: String,
      required: true,
    },
    // Human-readable e.g. "Late Blight"
    diseaseName: {
      type: String,
      required: true,
    },
    cropName: {
      type: String,
      required: true,
    },
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 100,
    },
    isHealthy: {
      type: Boolean,
      required: true,
    },
    treatmentAdvice: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    location: {
      city: { type: String, default: '' },
      lat:  { type: Number, default: null },
      lng:  { type: Number, default: null },
    },
  },
  { timestamps: true }
);

// Efficient query for user's history sorted by newest first
detectionSchema.index({ userId: 1, createdAt: -1 });

const Detection = mongoose.model('Detection', detectionSchema);
export default Detection;
