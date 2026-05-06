// models/Detection.js
import mongoose from 'mongoose';

const detectionSchema = new mongoose.Schema(
  {
    // Reference to User._id (null if user not synced yet)
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    // Fallback identifier if userId is null
    userEmail: {
      type: String,
      default: '',
      lowercase: true,
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
    // 0.0 → 1.0 decimal (frontend sends decimals e.g. 0.92)
    confidence: {
      type: Number,
      required: true,
      min: 0,
      max: 1,
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
    // Explicit timestamp from frontend (also covered by createdAt below)
    detectedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }  // also adds createdAt + updatedAt automatically
);

// Efficient query for user's detection history sorted newest first
detectionSchema.index({ userId: 1, createdAt: -1 });
detectionSchema.index({ userEmail: 1, createdAt: -1 });

const Detection = mongoose.model('Detection', detectionSchema);
export default Detection;