const express = require("express");
const router = express.Router();
const { changePassword } = require("../controllers/changePasswordController");
const { identifier } = require("../middleware/identifier");


router.patch(
    "/auth/change-password",
    identifier,
    changePassword
);

module.exports = router;