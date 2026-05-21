const storage = require("../config/gcpStorage");

exports.deleteFolderFromGCP = async (bucketName, folderPrefix) => {
    const bucket = storage.bucket(bucketName);

    const [files] = await bucket.getFiles({
        prefix: folderPrefix
    });

    if (!files.length) return;

    await Promise.all(
        files.map(file => file.delete())
    );

    console.log(`🗑 Deleted ${files.length} files from ${bucketName}/${folderPrefix}`);
};