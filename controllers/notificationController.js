const Notification = require("../models/notification");

exports.getUserNotifications = async (req, res) => {
    try {
        const userId = req.userId;
        const role = req.role;

        const notifications = await Notification.find(
            { userId, role },
            { link: 0 }   // ❌ exclude link field
        ).sort({ createdAt: -1 });

        return res.status(200).json({ notifications });

    } catch (err) {
        return res.status(500).json({
            message: "Error fetching notifications",
            error: err.message,
        });
    }
};




exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;

        const updated = await Notification.findOneAndUpdate(
            { _id: id, userId: req.userId, role: req.role },
            { read: true }
        );

        if (!updated) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ message: "Notification marked as read" });

    } catch (err) {
        res.status(500).json({ message: "Failed to update notification" });
    }
};


exports.markAllAsRead = async (req, res) => {
    try {
        await Notification.updateMany(
            { userId: req.userId, role: req.role, read: false },
            { read: true }
        );

        res.status(200).json({ message: "All notifications marked as read" });

    } catch (err) {
        res.status(500).json({ message: "Failed to update notifications" });
    }
};


exports.deleteNotification = async (req, res) => {
    try {
        const deleted = await Notification.findOneAndDelete({
            _id: req.params.id,
            userId: req.userId,
            role: req.role
        });

        if (!deleted) {
            return res.status(404).json({ message: "Notification not found" });
        }

        res.status(200).json({ message: "Notification deleted" });

    } catch (err) {
        res.status(500).json({ message: "Failed to delete notification" });
    }
};


exports.clearUserNotifications = async (req, res) => {
    try {
        const result = await Notification.deleteMany({
            userId: req.userId,
            role: req.role
        });

        res.status(200).json({
            message: `Deleted ${result.deletedCount} notifications`
        });

    } catch (err) {
        res.status(500).json({ message: "Failed to clear notifications" });
    }
};