const mongoose = require('mongoose');

const JobPreferenceSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true, required: true },
  preferredLocation: { type: String, required: true, trim: true },
  preferredCategories: [{ type: String, required: true, trim: true  }], 
}, { timestamps: true });

JobPreferenceSchema.virtual('preferredLocationLower').get(function() {
  return (this.preferredLocation || '').trim().toLowerCase();
});

module.exports = mongoose.model('JobPreference', JobPreferenceSchema);