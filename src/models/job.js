const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema({
  applicantName: { type: String, required: true },
  coverLetter: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now }
});

const jobSchema = new mongoose.Schema({
  title: { type: String, required: true },
  category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true }, // Reference to Category
  location: { type: String, required: true },
  shiftDetails: { type: String, required: true },
  employerId: { type: String, required: true }, // Temporary string, to be updated with authentication
  createdAt: { type: Date, default: Date.now },
  applications: [applicationSchema] // Array of applications
});

// keep a normalized location for searching
jobSchema.pre('save', function(next){
  this.locationLower = (this.location || '').trim().toLowerCase();
  next();
});

// helpful compound index for queries
jobSchema.index({ category: 1, locationLower: 1, createdAt: -1 });
module.exports = mongoose.model('Job', jobSchema);