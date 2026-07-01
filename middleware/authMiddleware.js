const jwt = require("jsonwebtoken");
const User = require("../models/user");

const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Not authorized to access this route, no token provided",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.id?._id || decoded.id;
    let user = await User.findById(userId);
    if (!user) {
      const AdminModel = require("../models/admin");
      user = await AdminModel.findById(userId);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "The user belonging to this token no longer exists",
      });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error("JWT verification error:", error);
    return res.status(401).json({
      success: false,
      message: "Not authorized, token failed or expired",
    });
  }
};

module.exports = { protect };
