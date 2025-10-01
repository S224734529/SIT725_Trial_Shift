const mongoose = require('mongoose');
const JobPreference = require('../../../src/models/jobPreference');

const createJobPreference = (overrides = {}) => {
  const defaults = {
    user: new mongoose.Types.ObjectId(),
    preferredLocation: 'Default Location',
    preferredCategories: ['Default Category'],
  };

  return { ...defaults, ...overrides };
};

const createJobPreferenceInDB = async (overrides = {}) => {
  const data = createJobPreference(overrides);
  return await JobPreference.create(data);
};

module.exports = {
  createJobPreference,
  createJobPreferenceInDB
};