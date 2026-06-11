const express = require('express');
const router = express.Router();
const Doubt = require('../models/Doubt');

/**
 * Route: GET /doubts-list/:facultyId
 * Purpose: Retrieves all student grievances/queries assigned to a specific faculty member.
 * Logic: Performs a relational join (populate) with the 'User' collection to fetch student metadata.
 * Sorting: Categorized by 'createdAt' in descending order to prioritize recent queries.
 */
router.get('/doubts-list/:facultyId', async (req, res) => {
    try {
        const { facultyId } = req.params;

        // Fetching doubt documents mapped to the faculty ID
        const grievances = await Doubt.find({ facultyId })
            .populate('studentId', 'name id initials') // Hydrating student reference with identity details
            .sort({ createdAt: -1 });
        
        res.json(grievances);
    } catch (err) {
        console.error("Grievance Retrieval Error:", err.message);
        res.status(500).json({ error: "Institutional database sync failed." });
    }
});

/**
 * Route: PUT /reply-doubt/:doubtId
 * Purpose: Commits a faculty response to a specific student grievance.
 * Payload: Expects 'answer' string in the request body.
 * State Management: Updates status to 'Resolved' and resets student read-flag for notification.
 */
router.put('/reply-doubt/:doubtId', async (req, res) => {
    try {
        const { doubtId } = req.params;
        const { answer } = req.body;

        // Atomic update of the doubt document
        const updatedGrievance = await Doubt.findByIdAndUpdate(
            doubtId, 
            { 
                answer, 
                status: 'Resolved',
                isReadByStudent: false // Triggers 'New Message' indicator on student terminal
            }, 
            { new: true } // Returns the modified document instead of the original
        );

        if (!updatedGrievance) {
            return res.status(404).json({ error: "Target grievance node not found." });
        }

        res.json(updatedGrievance);
    } catch (err) {
        console.error("Grievance Resolution Error:", err.message);
        res.status(500).json({ error: "Failed to commit response to registry." });
    }
});

module.exports = router;