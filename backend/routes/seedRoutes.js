const express = require('express');
const router = express.Router();
const User = require('../models/User');
const bcrypt = require('bcryptjs');

/**
 * Route: GET /run
 * Purpose: Database Seeding & Initialization
 * Logic: Performs a destructive reset of the User collection and injects baseline Administrative/Faculty accounts.
 * Security Note: This route should be disabled or protected in a production environment.
 */
router.get('/run', async (req, res) => {
    try {
        // 1. Database Purge: Remove all existing records to ensure a clean state for seeding
        await User.deleteMany({});

        // 2. Provisioning System Administrator
        // Password Hashing: Utilizing bcrypt with a salt round of 10 for cryptographic security
        const adminHash = await bcrypt.hash("admin123", 10);
        await User.create({
            name: 'Rajesh Kumar',
            email: 'admin@academia.ai',
            password: adminHash,
            role: 'admin',
            initials: 'RK',
            id: 'A1001' // Standardized Administrative ID
        });

        // 3. Provisioning Faculty Lead
        const teacherHash = await bcrypt.hash("password123", 10);
        await User.create({
            name: 'Dr. Priya Sharma',
            email: 'teacher@academia.ai',
            password: teacherHash,
            role: 'faculty', // Mapping to 'faculty' role for RBAC authorization
            initials: 'PS',
            department: 'Computer Science',
            id: 'F5001' // Standardized Faculty ID
        });

        // Response: Confirming completion of the data synchronization and seeding process
        res.json({ 
            success: true,
            message: "Institutional Database Synchronized: Admin and Faculty nodes initialized successfully." 
        });

    } catch (err) {
        console.error("Seeding Engine Failure:", err.message);
        res.status(500).json({ 
            success: false,
            error: "Data seeding protocol failed: " + err.message 
        });
    }
});

module.exports = router;