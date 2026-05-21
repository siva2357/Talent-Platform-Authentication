const crypto = require("crypto");

exports.hmacProcess = (data, secret) => {
    if (!secret) {
        throw new Error("HMAC secret key is missing");
    }
    return crypto.createHmac("sha256", secret).update(data).digest("hex");
};
