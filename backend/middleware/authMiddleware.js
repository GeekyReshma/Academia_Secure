// backend/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Middleware: protect
 * Purpose: Authenticates incoming requests by validating the JWT in the Authorization header.
 * Mechanism: Extracts Bearer token, verifies signature, and hydrates 'req.user' with database metadata.
 */
const protect = async (req, res, next) => {
    let token;

    // Validate if the Authorization header exists and follows the 'Bearer' schema
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            // Extraction: Splitting 'Bearer <token>' to isolate the encoded string
            token = req.headers.authorization.split(' ')[1];

            // Verification: Decrypting the token using the system's JWT_SECRET
            const decoded = jwt.verify(token, process.env.JWT_SECRET);

            /**
             * Hydration: Fetching user details from MongoDB based on decoded ID.
             * Optimization: '-password' ensures sensitive credential data is not leaked into the request object.
             */
            req.user = await User.findById(decoded.id).select('-password');

            // Verification successful: Proceed to the next middleware or controller
            next(); 
        } catch (error) {
            console.error("Authentication Layer Error:", error.message);
            return res.status(401).json({ message: 'Not authorized: Token verification failed' });
        }
    }

    // Safety check: Halt execution if no token stream was detected in the headers
    if (!token) {
        return res.status(401).json({ message: 'Not authorized: Access token missing' });
    }
};

module.exports = { protect };