const { uploadToGCP } = require("../utils/gcpUploader");
const { deleteFolderFromGCP } = require("../utils/gcpCleaner");
const BUCKET_MAP = require("../constants/bucketMap");
const SECTIONS = require("../constants/uploadSections");

exports.uploadFile = async (req, res) => {
    try {
        const {
            bucketKey,
            section,
            replace = "false",
            subfolder = ""
        } = req.body;

        const file = req.file;

        if (!bucketKey) {
            return res.status(400).json({
                success: false,
                message: "bucketKey is required"
            });
        }

        if (!section) {
            return res.status(400).json({
                success: false,
                message: "section is required"
            });
        }

        if (!file) {
            return res.status(400).json({
                success: false,
                message: "File is required"
            });
        }

        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: "User not authenticated"
            });
        }

        console.log("=================================");
        console.log("UPLOAD USER:", req.user);
        console.log("UPLOAD ROLE:", req.user?.role);
        console.log("UPLOAD NAME:", req.user?.registrationDetails?.fullName);
        console.log("=================================");

        const bucketName = BUCKET_MAP[bucketKey];

        if (!bucketName) {
            return res.status(400).json({
                success: false,
                message: "Invalid bucketKey"
            });
        }

        const roleKey = String(req.user.role || "")
            .trim()
            .toLowerCase();

        const roleSections = SECTIONS[roleKey];

        if (!roleSections) {
            return res.status(403).json({
                success: false,
                message: `No upload configuration found for role: ${roleKey}`
            });
        }

        const sectionFolder = roleSections[section];

        if (!sectionFolder) {
            return res.status(403).json({
                success: false,
                message: `Upload section '${section}' not allowed for role '${roleKey}'`
            });
        }

        const fullName = req.user.registrationDetails?.fullName;

        if (!fullName) {
            return res.status(400).json({
                success: false,
                message: "User full name missing"
            });
        }

        const safeFullName = fullName
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]+/g, "_");

        const safeSubfolder = String(subfolder)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "_");

        const folderPath = safeSubfolder
            ? `${safeFullName}/${sectionFolder}/${safeSubfolder}`
            : `${safeFullName}/${sectionFolder}`;

        const shouldReplace = String(replace).toLowerCase() === "true";

        console.log("BUCKET:", bucketName);
        console.log("ROLE:", roleKey);
        console.log("SECTION:", section);
        console.log("FOLDER:", folderPath);
        console.log("REPLACE:", shouldReplace);

        if (shouldReplace) {
            await deleteFolderFromGCP(bucketName, folderPath);
        }

        const fileUrl = await uploadToGCP(
            file,
            bucketName,
            folderPath
        );

        return res.status(200).json({
            success: true,
            message: "File uploaded successfully",
            url: fileUrl
        });

    } catch (err) {
        console.error("UPLOAD ERROR:", err);

        return res.status(500).json({
            success: false,
            message: "File upload failed"
        });
    }
};