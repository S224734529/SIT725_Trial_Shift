const Module = require('../models/module');
const cloudinary = require('../config/cloudinary');

// Create a new module
exports.createModule = async (req, res) => {
  try {
    const { title, category } = req.body;
    if (!title || !category) {
      return res.status(400).json({ error: 'Title and Category are required.' });
    }
    const mod = new Module(req.body);
    await mod.save();
    res.status(201).json(mod);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Upload assets to a module
exports.uploadAssets = async (req, res) => {
  try {
    const moduleId = req.params.id;
    const mod = await Module.findById(moduleId);
    if (!mod) return res.status(404).json({ error: 'Module not found' });

    let asset;

    if (req.file) {
      const isPdf = req.file.mimetype === 'application/pdf';
      const incomingTitle = typeof (req.body && req.body.title) === 'string' ? req.body.title.trim() : '';
      asset = {
        title: incomingTitle || req.file.originalname || 'Attachment',
        type: isPdf ? 'pdf' : 'image',
        url: req.file.path,
        publicId: req.file.filename,
      };
    } else {
      const { type, title, text, url } = req.body;
      if (!type || !title) {
        return res.status(400).json({ error: 'Type and title are required.' });
      }

      asset = { type, title };

      if (type === 'text') {
        asset.text = text || '';
      } else {
        if (!url) {
          return res.status(400).json({ error: 'URL is required for this asset type.' });
        }
        asset.url = url;
      }
    }

    mod.assets.push(asset);
    await mod.save();

    const savedAsset = mod.assets[mod.assets.length - 1];
    res.status(201).json({ message: 'Asset uploaded', asset: savedAsset });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// Delete a module
exports.deleteModule = async (req, res) => {
  try {
    const mod = await Module.findByIdAndDelete(req.params.id);
    if (!mod) return res.status(404).json({ error: 'Module not found' });
    res.json({ message: 'Module deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


// Fetch all modules (archived handling)
exports.getModules = async (req, res) => {
  try {
    const { category, search, visibility, archived } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (visibility) filter.visibility = visibility;
    if (search) filter.title = { $regex: search, $options: 'i' };

    // Archived filtering rules
    const isAdmin = req.user && req.user.role === 'admin';
    if (typeof archived !== 'undefined') {
      const val = String(archived).toLowerCase();
      if (val === 'only' || val === 'true') {
        filter.isArchived = true;
      } else if (val === 'false' || val === 'active') {
        filter.isArchived = { $ne: true };
      }
    } else if (!isAdmin) {
      filter.isArchived = { $ne: true };
    }

    const modules = await Module.find(filter);
    res.json(modules);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Fetch module details and assets
exports.getModuleById = async (req, res) => {
  try {
    const mod = await Module.findById(req.params.id);
    if (!mod) return res.status(404).json({ error: 'Module not found' });
    const isAdmin = req.user && req.user.role === 'admin';
    if (mod.isArchived && !isAdmin) {
      return res.status(404).json({ error: 'Module not found' });
    }
    res.json(mod);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update or archive a module
exports.updateModule = async (req, res) => {
  try {
    const mod = await Module.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!mod) return res.status(404).json({ error: 'Module not found' });
    res.json(mod);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};


// Bulk delete courses
exports.bulkDeleteCourses = async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty IDs array' });
    }
    await Module.deleteMany({ _id: { $in: ids } });
    res.status(200).json({ message: 'Courses deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Bulk archive/unarchive courses
exports.bulkArchiveModules = async (req, res) => {
  try {
    const { ids, isArchived } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ error: 'Invalid or empty IDs array' });
    }
    const archiveState = typeof isArchived === 'boolean' ? isArchived : true;
    const result = await Module.updateMany(
      { _id: { $in: ids } },
      { $set: { isArchived: archiveState } }
    );
    res.status(200).json({ message: archiveState ? 'Courses archived successfully' : 'Courses unarchived successfully', matched: result.matchedCount ?? result.nModified, modified: result.modifiedCount ?? result.nModified });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete a specific asset from a module
exports.deleteAsset = async (req, res) => {
  try {
    const { id, assetId } = req.params;
    const mod = await Module.findById(id);
    if (!mod) return res.status(404).json({ error: 'Module not found' });

    const asset = mod.assets.id(assetId);
    if (!asset) return res.status(404).json({ error: 'Asset not found' });

    if (asset.publicId) {
      const resourceType = asset.type === 'pdf' ? 'raw' : 'image';
      try {
        await cloudinary.uploader.destroy(asset.publicId, { resource_type: resourceType });
      } catch (cloudErr) {
        console.error('Cloudinary destroy failed', cloudErr);
      }
    }

    await asset.deleteOne();
    await mod.save();

    res.json({ message: 'Asset removed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
