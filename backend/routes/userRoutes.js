// backend/routes/userRoutes.js
const express = require('express');
const router = express.Router();
const User = require('../models/User');

/**
 * Route: GET /all
 * Purpose: Retrieves the entire institutional user registry.
 * Logic: Fetches all nodes from the User collection and sorts them by 'createdAt' 
 * in descending order to prioritize recent registrations.
 */
router.get('/all', async (req, res) => {
    try {
        const users = await User.find().sort({ createdAt: -1 });
        res.json(users);
    } catch (err) {
        console.error("Registry Retrieval Error:", err.message);
        res.status(500).json({ message: "Internal Server Error: Failed to synchronize user nodes." });
    }
});

/**
 * Route: POST /add
 * Purpose: Identity Provisioning (Adding a new user node).
 * Logic: 
 * 1. Performs string parsing to auto-generate user initials for UI/UX rendering.
 * 2. Generates a randomized institutional Display ID.
 * 3. Commits the new identity to the MongoDB cluster.
 */
router.post('/add', async (req, res) => {
    try {
        const { name, email, department, batch, role } = req.body;

        /**
         * Identity Helper: Initials Generation
         * Transforms "Anirudh Kumar" into "AK" to support avatar rendering in the portal.
         */
        const nameParts = name.trim().split(' ');
        const initials = nameParts.length > 1 
            ? nameParts[0][0] + nameParts[nameParts.length - 1][0] 
            : nameParts[0][0];

        /**
         * Display ID Engine:
         * Generates a unique-style 4-digit institutional identifier for front-facing dashboard cards.
         */
        const displayId = '#' + Math.floor(1000 + Math.random() * 9000);

        const newUser = new User({
            name,
            email: email.toLowerCase().trim(), // Normalizing email for identity consistency
            department,
            batch,
            role,
            initials: initials.toUpperCase(),
            id: displayId
        });

        await newUser.save();
        res.status(201).json({ message: "Identity provisioned successfully.", user: newUser });
    } catch (err) {
        console.error("Identity Provisioning Error:", err.message);
        res.status(400).json({ message: "Payload Validation Failed: Unable to commit user node." });
    }
});

module.exports = router;