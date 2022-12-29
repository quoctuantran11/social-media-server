const jwt = require("jsonwebtoken");

const verifyToken = (req, res, next) => {
    const authHeader = req.headers.authorization
    if (authHeader) {
        const token = authHeader.split(' ')[1];

        if (!token) {
            return res.status(403).send("Access denied !");
        }
        try {
            const decoded = jwt.verify(token, process.env.USER_TOKEN, { algorithms: ["HS256"] });
            req.user = decoded;
        } catch (err) {
            return res.status(401).send("Invalid Token");
        }
    }
    return next();
};

module.exports = verifyToken;