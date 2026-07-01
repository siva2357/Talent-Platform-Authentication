require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const app = express();

/* ================= CORS ================= */
const corsOptions = {
  origin: [
    "https://talent-hub-257d6.web.app",
    "https://talent-hub-257d6.firebaseapp.com",
    "http://localhost:4200",
  ],
  credentials: false,
  methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};

app.use(cors(corsOptions));
app.options("*", cors(corsOptions));

/* ================= BODY PARSER ================= */
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/* ================= CACHE CONTROL ================= */
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store");
  next();
});

/* ================= HEALTH CHECK ================= */
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "Talent Hub Backend Running",
    env: process.env.NODE_ENV,
  });
});

/* ================= ROUTES ================= */
app.use("/api", require("./routes/appRoutes"));


/* ================= 404 ================= */
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

/* ================= GLOBAL ERROR ================= */
app.use((err, req, res, next) => {
  console.error("Global Error:", err);
  res.status(err.statusCode || 500).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

const { createDefaultAdmin } = require("./controllers/adminController");

// Environment detection
const isLocal = process.env.NODE_ENV !== "production" && !!process.env.MONGO_LOCAL_URI;
const PORT = process.env.PORT || (isLocal ? 5000 : 8080);
const MONGO_URI = isLocal ? process.env.MONGO_LOCAL_URI : process.env.MONGO_URI;

console.log(`🚀 Backend starting in ${isLocal ? "LOCAL" : "PRODUCTION"} mode...`);

const startServer = async () => {
  try {
    if (MONGO_URI) {
      await mongoose.connect(MONGO_URI, { autoIndex: true });
      console.log(`📦 MongoDB Connected (${isLocal ? "LOCAL" : "PRODUCTION"})`);
      await createDefaultAdmin();
      console.log("👤 Default admin ready");
    } else {
      console.log("⚠️ No MongoDB URI found, running without database connection.");
    }

    app.listen(PORT, "0.0.0.0", () => {
      console.log(`🌐 Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err.message);
    process.exit(1);
  }
};

startServer();

/* Prevent crashes */
process.on("unhandledRejection", (err) => { console.error("Unhandled Promise Rejection:", err); });
process.on("uncaughtException", (err) => { console.error("Uncaught Exception:", err); });