const express = require("express");
const { protect } = require("../middleware/authMiddleware");

const {
  createPortfolio,
  getMyPortfolio,
  getPortfolioByFreelancerId,
  updatePortfolio,
  deletePortfolio
} = require("../controllers/portfolioController");

const router = express.Router();

router.post("/", protect, createPortfolio);

router.get("/my", protect, getMyPortfolio);

router.get(
  "/freelancer/:freelancerId",
  protect,
  getPortfolioByFreelancerId
);

router.put(
  "/:portfolioId",
  protect,
  updatePortfolio
);

router.delete(
  "/:portfolioId",
  protect,
  deletePortfolio
);

module.exports = router;