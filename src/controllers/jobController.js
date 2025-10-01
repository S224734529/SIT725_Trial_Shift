const Job = require('../models/job');
const Category = require('../models/category');

// Create a new job
exports.createJob = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    const { title, category, location, shiftDetails } = req.body;
    const employerId = '12345'; // Temporary placeholder ID

    if (!title || !category || !location || !shiftDetails) {
      throw new Error('All fields (title, category, location, shiftDetails) are required');
    }

    let categoryDoc = await Category.findOne({ name: category });
    if (!categoryDoc) {
      categoryDoc = await Category.create({ name: category });
    }

    const job = new Job({
      title,
      category: categoryDoc._id,
      location,
      shiftDetails,
      employerId
    });

    const savedJob = await job.save();
    console.log('Job saved:', savedJob);
    res.status(201).json(savedJob);
  } catch (error) {
    console.error('Error creating job:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Update an existing job
exports.updateJob = async (req, res) => {
  try {
    const { id } = req.params;
    const { title, category, location, shiftDetails } = req.body;
    const employerId = '12345'; // Temporary placeholder ID

    let categoryDoc = await Category.findOne({ name: category });
    if (!categoryDoc && category) {
      categoryDoc = await Category.create({ name: category });
    }

    const job = await Job.findOneAndUpdate(
      { _id: id, employerId },
      { title, category: categoryDoc ? categoryDoc._id : undefined, location, shiftDetails, employerId },
      { new: true, runValidators: true, useFindAndModify: false }
    );

    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }

    console.log('Job updated:', job);
    res.status(200).json(job);
  } catch (error) {
    console.error('Error updating job:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Delete an existing job
exports.deleteJob = async (req, res) => {
  try {
    const { id } = req.params;
    const employerId = '12345'; // Temporary placeholder ID

    const job = await Job.findOneAndDelete({ _id: id, employerId });

    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }

    console.log('Job deleted:', job);
    res.status(200).json({ message: 'Job deleted successfully' });
  } catch (error) {
    console.error('Error deleting job:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Bulk delete jobs
exports.bulkDeleteJobs = async (req, res) => {
  try {
    const { jobIds } = req.body; // Array of job IDs to delete
    const employerId = '12345'; // Temporary placeholder ID

    if (!jobIds || !Array.isArray(jobIds) || jobIds.length === 0) {
      throw new Error('Job IDs array is required');
    }

    const result = await Job.deleteMany({ _id: { $in: jobIds }, employerId });

    if (result.deletedCount === 0) {
      return res.status(404).json({ message: 'No jobs found or unauthorized to delete' });
    }

    console.log('Bulk delete result:', result);
    res.status(200).json({ message: `${result.deletedCount} job(s) deleted successfully` });
  } catch (error) {
    console.error('Error bulk deleting jobs:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Get category counts
exports.getCategoryCounts = async (req, res) => {
  try {
    const allCategories = ['kitchenhand', 'cleaning', 'delivery', 'waiter', 'barista', 'pickpacker'];
    const categoryDocs = await Category.find({ name: { $in: allCategories } });

    const categoryMap = {};
    categoryDocs.forEach(cat => {
      categoryMap[cat.name.toLowerCase()] = cat._id;
    });

    const categoriesWithCounts = await Job.aggregate([
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'categories',
          localField: '_id',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      {
        $unwind: '$categoryDetails'
      },
      {
        $project: {
          name: '$categoryDetails.name',
          count: 1
        }
      }
    ]);

    const categoryCounts = allCategories.map(name => {
      const foundCat = categoriesWithCounts.find(cat => cat.name.toLowerCase() === name.toLowerCase()) || { name, count: 0 };
      return {
        name: foundCat.name,
        count: foundCat.count
      };
    });

    console.log('Category counts (raw):', categoryCounts);
    res.status(200).json(categoryCounts);
  } catch (error) {
    console.error('Error fetching category counts:', error.message);
    res.status(500).json({ message: 'Error fetching category counts' });
  }
};

// Apply for a job
exports.applyForJob = async (req, res) => {
  try {
    const { jobId, applicantName, coverLetter } = req.body;
    const employerId = '12345'; // Temporary placeholder ID (for job owner check)

    if (!jobId || !applicantName || !coverLetter) {
      throw new Error('All fields (jobId, applicantName, coverLetter) are required');
    }

    const job = await Job.findOne({ _id: jobId, employerId });

    if (!job) {
      return res.status(404).json({ message: 'Job not found or unauthorized' });
    }

    job.applications.push({ applicantName, coverLetter, appliedAt: new Date() });
    const updatedJob = await job.save();

    console.log('Application added:', updatedJob);
    res.status(201).json({ message: 'Application submitted successfully', jobId: updatedJob._id });
  } catch (error) {
    console.error('Error applying for job:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Get available jobs
exports.getJobs = async (req, res) => {
  try {
    const jobs = await Job.find({ employerId: '12345' })
      .populate('category', 'name') // Populate only the name field from Category
      .select('title location shiftDetails _id category');
    console.log('Fetched jobs with categories (raw):', jobs); // Detailed debug log
    if (jobs.length === 0) {
      console.log('No jobs found with employerId: 12345');
    }
    res.status(200).json(jobs.map(job => ({
      ...job.toObject(),
      category: job.category ? job.category.name : 'Unknown'
    })));
  } catch (error) {
    console.error('Error fetching jobs:', error.message);
    res.status(500).json({ message: 'Error fetching jobs' });
  }
};

// Get employer jobs
exports.getEmployerJobs = async (req, res) => {
  try {
    const employerId = '12345'; // Temporary placeholder ID
    const jobs = await Job.find({ employerId })
      .populate('category', 'name') // Populate category name
      .select('title location shiftDetails _id');
    console.log('Fetched employer jobs:', jobs);
    if (jobs.length === 0) {
      return res.status(200).json({ message: 'No jobs found for this employer' });
    }
    res.status(200).json(jobs);
  } catch (error) {
    console.error('Error fetching employer jobs:', error.message);
    res.status(500).json({ message: 'Error fetching employer jobs' });
  }
};


// Get all categories
exports.getCategories = async (req, res) => {
  try {
    const categories = await Category.find();
    res.status(200).json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error.message);
    res.status(500).json({ message: 'Error fetching categories' });
  }
};

// Create a new category
exports.createCategory = async (req, res) => {
  try {
    const { name, description } = req.body;
    if (!name) throw new Error('Category name is required');
    const category = new Category({ name, description });
    const savedCategory = await category.save();
    res.status(201).json(savedCategory);
  } catch (error) {
    console.error('Error creating category:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Update an existing category
exports.updateCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;
    const category = await Category.findByIdAndUpdate(id, { name, description }, { new: true, runValidators: true });
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.status(200).json(category);
  } catch (error) {
    console.error('Error updating category:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Delete an existing category
exports.deleteCategory = async (req, res) => {
  try {
    const { id } = req.params;
    const category = await Category.findByIdAndDelete(id);
    if (!category) return res.status(404).json({ message: 'Category not found' });
    res.status(200).json({ message: 'Category deleted successfully' });
  } catch (error) {
    console.error('Error deleting category:', error.message);
    res.status(400).json({ message: error.message });
  }
};

// Existing exports (getCategoryCounts, etc.) remain unchanged...