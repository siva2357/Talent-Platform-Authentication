const multer = require("multer");

// Configure multer in-memory storage for GCS streaming
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB file size limit
  }
});

module.exports = upload;
