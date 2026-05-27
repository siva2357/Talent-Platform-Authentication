const jwt = require("jsonwebtoken");

exports.identifier = (req, res, next) => {

    try {

        let token =
            req.headers.authorization ||
            req.headers.Authorization ||
            req.query.token;

        if (!token && req.cookies?.Authorization) {
            token = req.cookies.Authorization;
        }

        if (!token) {

            return res.status(401).json({
                success: false,
                message: "Unauthorized: No token provided",
            });

        }

        if (token.startsWith("Bearer ")) {
            token = token.split(" ")[1];
        }

        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET
        );

        // ====================================
        // FIX
        // ====================================

        req.userId =
            decoded.id?._id ||
            decoded.userId;

        req.role =
            decoded.id?.role ||
            decoded.role;

        req.user = {
            ...decoded,
            userId:
                decoded.id?._id ||
                decoded.userId,
            role:
                decoded.id?.role ||
                decoded.role
        };

        console.log("ROLE =>", req.role);
        console.log("USER ID =>", req.userId);

        next();

    }

    catch (err) {

        console.error(
            "Identifier error:",
            err.message
        );

        return res.status(401).json({
            success: false,
            message: "Invalid or expired token",
        });

    }

};