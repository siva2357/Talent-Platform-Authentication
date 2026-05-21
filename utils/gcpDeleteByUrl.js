const storage = require("../config/gcpStorage");

/**
 * Deletes a single GCP file using its public URL
 * Example URL:
 * https://storage.googleapis.com/jobseeker-data/siva_prasad_kurra/project-files/file.jpg
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