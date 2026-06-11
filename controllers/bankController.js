const { banks } = require('../constants/banks');

exports.getBanks = async (req, res) => {
  try {

    return res.status(200).json({
      success: true,
      banks
    });

  } catch (error) {

    return res.status(500).json({
      success: false,
      message: 'Failed to fetch banks',
      error: error.message
    });

  }
};