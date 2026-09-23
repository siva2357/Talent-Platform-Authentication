const MasterData = require("../models/masterData");

exports.getAllMasterData = async (req, res) => {
  try {
    const data = await MasterData.find({});
    // Format into an easy dictionary { Languages: [{key, value}], ... }
    const result = {};
    data.forEach(item => {
      result[item.category] = item.options;
    });
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch master data", error: error.message });
  }
};

exports.getMasterDataByCategory = async (req, res) => {
  try {
    const category = req.params.category;
    const data = await MasterData.findOne({ category });
    if (!data) return res.status(404).json({ success: false, message: "Category not found" });
    res.status(200).json({ success: true, data: data.options });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to fetch category data", error: error.message });
  }
};
