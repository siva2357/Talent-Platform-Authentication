const express = require("express");
const router = express.Router();
const upload = require("../middleware/upload");
const { protect } = require("../middleware/authMiddleware");
const { uploadFile } = require("../controllers/uploadController");

router.post(
    "/upload",
    protect,
    upload.single("file"),
    uploadFile
);

module.exports = router;