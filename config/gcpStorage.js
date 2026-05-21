const { Storage } = require("@google-cloud/storage");

const storage = new Storage(); // 👈 NO config

module.exports = storage;