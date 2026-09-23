const express = require("express");
const router = express.Router();
const { getAllMasterData, getMasterDataByCategory } = require("../controllers/masterDataController");

router.get("/", getAllMasterData);
router.get("/:category", getMasterDataByCategory);

module.exports = router;
