const { v4: uuidv4 } = require("uuid");
const storage = require("../config/gcpStorage");

exports.uploadToGCP = async (file, bucketName, folder = "uploads") => {
    if (!file) throw new Error("File missing");
    if (!bucketName) throw new Error("Bucket name missing");

    const bucket = storage.bucket(bucketName);

    // sanitize filename
    const safeName = file.originalname
        .toLowerCase()
        .replace(/[^a-z0-9.\-_]/g, "_");

    const fileName = `${folder}/${Date.now()}-${uuidv4()}-${safeName}`;
    const blob = bucket.file(fileName);

    const stream = blob.createWriteStream({
        resumable: false,
        metadata: {
            contentType: file.mimetype,
            contentDisposition: "inline",
            cacheControl: "public, max-age=31536000"
        }
    });


    return new Promise((resolve, reject) => {
        stream.on("error", (err) => {
            console.error("GCP upload error:", err);
            reject(new Error("GCP upload failed"));
        });

        stream.on("finish", async () => {
            try {
                // Make public only if bucket allows it
                await blob.makePublic();

                resolve(`https://storage.googleapis.com/${bucketName}/${fileName}`);
            } catch (err) {
                console.error("makePublic error:", err);

                // Still return URL (file exists)
                resolve(`https://storage.googleapis.com/${bucketName}/${fileName}`);
            }
        });

        stream.end(file.buffer);
    });
};