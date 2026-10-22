const storage = require("../config/gcpStorage");

/**
 * Deletes a single GCP file using its public URL
 * Example URL:
 * https://storage.googleapis.com/freelancer-files/64b5f8c8a1b2c3d4e5f6a7b8/profile-photo/file.jpg
 */
exports.deleteFileFromGCPByUrl = async (fileUrl) => {
    if (!fileUrl) return;

    const decodedUrl = decodeURIComponent(fileUrl);

    // Extract bucket name & file path
    const match = decodedUrl.match(
        /^https:\/\/storage\.googleapis\.com\/([^/]+)\/(.+)$/
    );

    if (!match) return;

    const [, bucketName, filePath] = match;

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(filePath);

    try {
        await file.delete();
        console.log(`🗑 Deleted file: ${bucketName}/${filePath}`);
    } catch (err) {
        // Ignore if already deleted
        if (err.code !== 404) {
            console.error("GCP file delete error:", err.message);
        }
    }
};