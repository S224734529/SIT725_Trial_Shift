const JobPreference = require('../models/jobPreference');

// GET /api/job-preferences
exports.list = async (req, res) => {
  try {
    const prefs = await JobPreference.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.json(prefs);
  } catch (e) {
    res.status(500).json({ message: 'Failed to load preferences' });
  }
};

// POST /api/job-preferences
// exports.create = async (req, res) => {
//   try {
//     const { preferredLocation, preferredCategories = [] } = req.body;
//     if (!preferredLocation) return res.status(400).json({ message: 'preferredLocation is required' });

//     const pref = await JobPreference.create({
//       user: req.user.id,
//       preferredLocation,
//       preferredCategories,
//     });
//     res.status(201).json(pref);
//   } catch (e) {
//     res.status(500).json({ message: 'Failed to create preference' });
//   }
// };
exports.create = async (req, res) => {
  try {
    const { preferredLocation, preferredCategories } = req.body;
    if (!preferredLocation) return res.status(400).json({ message: 'preferredLocation is required' });

    let categories = preferredCategories;
    if (typeof categories === 'string') {
      categories = categories.split(',').map(s => s.trim()).filter(Boolean);
    } else if (!Array.isArray(categories)) {
      categories = [];
    }

    const pref = await JobPreference.create({
      user: req.user.id,
      preferredLocation,
      preferredCategories: categories,
    });
    res.status(201).json(pref);
  } catch (e) {
    console.error(e); // Add error logging
    res.status(500).json({ message: 'Failed to create preference' });
  }
};
// PUT /api/job-preferences/:id
exports.update = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = {};
    ['preferredLocation', 'preferredCategories'].forEach(k => {
      if (req.body[k] !== undefined) updates[k] = req.body[k];
    });

    const pref = await JobPreference.findOneAndUpdate(
      { _id: id, user: req.user.id },
      { $set: updates },
      { new: true }
    );
    if (!pref) return res.status(404).json({ message: 'Preference not found' });
    res.json(pref);
  } catch (e) {
    res.status(500).json({ message: 'Failed to update preference' });
  }
};

// DELETE /api/job-preferences/:id
exports.remove = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await JobPreference.deleteOne({ _id: id, user: req.user.id });
    if (!result.deletedCount) return res.status(404).json({ message: 'Preference not found' });
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ message: 'Failed to delete preference' });
  }
};

// DELETE /api/job-preferences   (body: { ids: [...] })
exports.bulkRemove = async (req, res) => {
  try {
    const { ids = [] } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ message: 'ids array required' });
    }
    const result = await JobPreference.deleteMany({ _id: { $in: ids }, user: req.user.id });
    res.json({ ok: true, removed: result.deletedCount || 0 });
  } catch (e) {
    res.status(500).json({ message: 'Failed to bulk delete' });
  }
};