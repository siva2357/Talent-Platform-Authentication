const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { identifier } = require('../middleware/identifier');

router.get("/notifications", identifier, notificationController.getUserNotifications);
router.patch("/notifications/:id/read", identifier, notificationController.markAsRead);
router.patch("/notifications/read-all", identifier, notificationController.markAllAsRead);
router.delete("/notifications/:id/delete", identifier, notificationController.deleteNotification);
router.delete("/notifications/clear", identifier, notificationController.clearUserNotifications);

module.exports = router;