const Notification = require("../models/notification");

exports.getUserNotifications = async (req, res) => {
    try {
        const userId = req.userId;
        const role = (req.role || "").toLowerCase();

        const query = { userId };
        if (role) {
            query.role = role;
        }

        // Include the link field so frontend can route on click
        const notifications = await Notification.find(query)
            .sort({ createdAt: -1 });

        return res.status(200).json({ 
            success: true,
            notifications 
        });

    } catch (err) {
        return res.status(500).json({
            success: false,
            message: "Error fetching notifications",
            error: err.message,
        });
    }
};

exports.markAsRead = async (req, res) => {
    try {
        const { id } = req.params;
        const role = (req.role || "").toLowerCase();

        const query = { _id: id, userId: req.userId };
        if (role) query.role = role;

        const updated = await Notification.findOneAndUpdate(
            query,
            { read: true },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        res.status(200).json({ success: true, message: "Notification marked as read", notification: updated });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update notification", error: err.message });
    }
};

exports.markAllAsRead = async (req, res) => {
    try {
        const role = (req.role || "").toLowerCase();
        const query = { userId: req.userId, read: false };
        if (role) query.role = role;

        await Notification.updateMany(
            query,
            { read: true }
        );

        res.status(200).json({ success: true, message: "All notifications marked as read" });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to update notifications", error: err.message });
    }
};

exports.deleteNotification = async (req, res) => {
    try {
        const role = (req.role || "").toLowerCase();
        const query = { _id: req.params.id, userId: req.userId };
        if (role) query.role = role;

        const deleted = await Notification.findOneAndDelete(query);

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Notification not found" });
        }

        res.status(200).json({ success: true, message: "Notification deleted" });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to delete notification", error: err.message });
    }
};

exports.clearUserNotifications = async (req, res) => {
    try {
        const role = (req.role || "").toLowerCase();
        const query = { userId: req.userId };
        if (role) query.role = role;

        const result = await Notification.deleteMany(query);

        res.status(200).json({
            success: true,
            message: `Deleted ${result.deletedCount} notifications`
        });

    } catch (err) {
        res.status(500).json({ success: false, message: "Failed to clear notifications", error: err.message });
    }
};