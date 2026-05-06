// models/User.js
import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    auth0Id: {
      type: String,
      required: true,
      unique: true,
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
    location: {
      city:  { type: String, default: '' },
      state: { type: String, default: '' },
      lat:   { type: Number, default: null },
      lng:   { type: Number, default: null },
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
  },
  { timestamps: true }
);

const User = mongoose.model('User', userSchema);
export default User;
