const JobPreference = require('../models/jobPreference');
const JobPosting   = require('../models/job');
const Category     = require('../models/category'); 

function unique(arr) { return Array.from(new Set(arr)); }
function toLowerTrim(s) { return (s || '').trim().toLowerCase(); }


exports.match = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const allowFlex = String(req.query.flex || 'true') === 'true';

    // 1) Load user preferences
    const prefs = await JobPreference.find({ user: req.user.id }).lean();

    if (!prefs.length) {
      return res.json({ strict: [], flex: [], usedPrefs: [] });
    }

    // Collect locations (lowercased) and category names/ids
    const locsLower = unique(prefs.map(p => toLowerTrim(p.preferredLocation)).filter(Boolean));

    // Handle categories from prefs (IDs or names)
    const catIdsFromPrefs = unique(
      prefs.flatMap(p => (p.preferredCategories || [])
        .filter(id => typeof id === 'string' || (id && id._id)) // if switched to IDs
      ).map(id => String(id._id || id))
    );

    const catNamesFromPrefs = unique(
      prefs.flatMap(p => (p.preferredCategories || [])
        .filter(c => typeof c === 'string')
        .map(c => toLowerTrim(c))
      )
    );

    // If we have names, map to Category IDs
    let nameMappedCatIds = [];
    if (catNamesFromPrefs.length) {
      const cats = await Category.find(
        { name: { $in: catNamesFromPrefs } },
        { _id: 1, name: 1 }
      ).lean();
      nameMappedCatIds = cats.map(c => String(c._id));
    }

    const categoryIdsUnion = unique([...catIdsFromPrefs, ...nameMappedCatIds]);

    // If nothing usable, return early
    if (!locsLower.length || !categoryIdsUnion.length) {
      return res.json({ strict: [], flex: [], usedPrefs: prefs });
    }

    // 2) STRICT MATCH (both location and category)
    const strictMatches = await JobPosting
      .find({
        category: { $in: categoryIdsUnion },
        locationLower: { $in: locsLower }
      })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('category', 'name')
      .lean();

    // If we have strict results OR flex not requested, return
    if (strictMatches.length || !allowFlex) {
      return res.json({ strict: strictMatches, flex: [], usedPrefs: prefs });
    }

    // 3) FLEX MATCH (either location OR category) + score
    // score: +2 for category match, +1 for location match (so 3 means both)
    const flexResults = await JobPosting
      .find({
        $or: [
          { category: { $in: categoryIdsUnion } },
          { locationLower: { $in: locsLower } }
        ]
      })
      .sort({ createdAt: -1 })
      .limit(limit * 2) // pull extra then score/slice
      .populate('category', 'name')
      .lean();

    const scored = flexResults.map(j => {
      const catMatch = categoryIdsUnion.includes(String(j.category?._id || j.category));
      const locMatch = locsLower.includes(String(j.locationLower));
      const score = (catMatch ? 2 : 0) + (locMatch ? 1 : 0);
      return { ...j, matchScore: score };
    })
    .filter(r => r.matchScore > 0)
    .sort((a, b) => b.matchScore - a.matchScore || b.createdAt - a.createdAt)
    .slice(0, limit);

    return res.json({ strict: [], flex: scored, usedPrefs: prefs });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ message: 'Failed to match jobs' });
  }
};