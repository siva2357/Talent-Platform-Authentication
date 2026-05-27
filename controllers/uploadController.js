const { uploadToGCP } = require("../utils/gcpUploader.js");
const { deleteFolderFromGCP } = require("../utils/gcpCleaner.js");
const BUCKET_MAP = require("../constants/bucketMap.js");
const SECTIONS = require("../constants/uploadSections.js");

exports.uploadFile = async (req, res) => {
    try {
        const { bucketKey, section, replace, subfolder } = req.body;
        const file = req.file;

        if (!bucketKey || !section) {
            return res.status(400).json({ message: "bucketKey and section are required" });
        }

        if (!file) {
            return res.status(400).json({ message: "File is required" });
        }

        const bucketName = BUCKET_MAP[bucketKey];
        if (!bucketName) {
            return res.status(400).json({ message: "Invalid bucketKey" });
        }

        const roleKey = req.user.role ? req.user.role.toLowerCase() : "";
        const roleSections = SECTIONS[roleKey];
        if (!roleSections || !roleSections[section]) {
            return res.status(403).json({ message: "Upload not allowed" });
        }

        const fullName = req.user.registrationDetails?.fullName;
        if (!fullName) {
            return res.status(400).json({ message: "User full name missing" });
        }

        const safeFullName = fullName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "_");

        const sectionFolder = roleSections[section];
        // Optional subfolder (e.g. contract title slug) for deeper organization
        const safeSubfolder = subfolder
            ? subfolder.toLowerCase().trim().replace(/[^a-z0-9]+/g, "_")
            : "";
        const folderPath = safeSubfolder
            ? `${safeFullName}/${sectionFolder}/${safeSubfolder}`
            : `${safeFullName}/${sectionFolder}`;

        if (replace === "true") {
            await deleteFolderFromGCP(bucketName, folderPath);
        }

        const fileUrl = await uploadToGCP(file, bucketName, folderPath);

        res.json({
            success: true,
            message: "File uploaded successfully",
            url: fileUrl
        });

    } catch (err) {
        console.error("uploadFile error:", err);
        res.status(500).json({ message: "File upload failed" });
    }
};