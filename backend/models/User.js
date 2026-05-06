// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    // Auth0 sub — optional for OTP users who don't have one
    auth0Id: {
      type: String,
      sparse: true,   // allows multiple docs with null auth0Id
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    phone: {
      type: String,
      default: '',
    },
    location: {
      city:  { type: String, default: '' },
      state: { type: String, default: '' },
      lat:   { type: Number, default: null },
      lng:   { type: Number, default: null },
    },
    primaryCrop: {
      type: String,
      default: '',
    },
    preferredLanguage: {
      type: String,
      default: 'en',
      enum: ['en', 'hi', 'ta', 'te', 'mr'],
    },
    savedWeatherLocations: {
      type: [String],
      default: [],
    },
    lastWeatherCity: {
      type: String,
      default: '',
    },
    // Every login appends an entry here
    loginHistory: [
      {
        loginAt: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true }  // createdAt = account creation, updatedAt = last profile change
);

const User = mongoose.model('User', userSchema);
export default User;