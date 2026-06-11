const express = require('express');
const router = express.Router();
const User = require('../models/User'); 
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');

/**
 * Mailer Configuration:
 * Utilizes Nodemailer with Gmail SMTP.
 * 'App Password' is required for secure environmental authentication.
 */
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

/**
 * Route: POST /request-otp
 * Step 1: Identity Verification & OTP Dispatch
 * Logic: Checks user existence via Email or System ID and dispatches a 6-digit cryptographic challenge.
 */
router.post('/request-otp', async (req, res) => {
    try {
        const { identifier } = req.body; 
        const cleanId = identifier.toLowerCase().trim();

        // Perform cross-field lookup to identify user node
        const user = await User.findOne({
            $or: [
                { email: cleanId },
                { id: identifier.toUpperCase().trim() }
            ]
        });

        if (!user) {
            return res.status(404).json({ message: "Identity not found in AcademiaAI registry." });
        }

        // Cryptographic Challenge: Generate 6-digit numeric string
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Persistence: Store challenge and TTL (Time-To-Live: 10 mins) in DB
        user.otp = otp;
        user.otpExpires = Date.now() + 600000; 
        await user.save();

        // Dispatch Mechanism: SMTP Transmission
        const mailOptions = {
            from: '"AcademiaAI Security" <${process.env.EMAIL_USER}>',
            to: user.email,
            subject: 'Secure Access Verification - AcademiaAI',
            html: `
                <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                    <h2 style="color: #2563eb;">Authentication Request</h2>
                    <p style="font-size: 16px; color: #444;">Hello ${user.name}, use the following code to verify your identity:</p>
                    <div style="background: #f1f5f9; padding: 20px; text-align: center; border-radius: 8px;">
                        <span style="font-size: 32px; font-weight: 800; letter-spacing: 5px; color: #1e293b;">${otp}</span>
                    </div>
                    <p style="font-size: 12px; color: #64748b; margin-top: 20px;">Verification TTL: 10 minutes. If you did not initiate this request, secure your account immediately.</p>
                </div>
            `
        };

        await transporter.sendMail(mailOptions);
        res.json({ message: "Verification challenge dispatched.", email: user.email });

    } catch (err) {
        console.error("Auth Engine Error (OTP_REQ):", err.message);
        res.status(500).json({ message: "Internal Security Engine failure." });
    }
});

/**
 * Route: POST /verify-otp
 * Step 2: Challenge Validation & Token Issuance
 * Logic: Validates the OTP against stored state and issues a signed JWT for session management.
 */
router.post('/verify-otp', async (req, res) => {
    try {
        const { identifier, otp } = req.body;
        const cleanId = identifier.toLowerCase().trim();

        const user = await User.findOne({
            $or: [
                { email: cleanId },
                { id: identifier.toUpperCase().trim() }
            ]
        });

        if (!user) return res.status(404).json({ message: "Identity resolution failed." });

        // State Validation: OTP match and Expiry check
        if (!user.otp || user.otp !== otp) {
            return res.status(401).json({ message: "Security Challenge Failed: Invalid Token." });
        }

        if (user.otpExpires < Date.now()) {
            return res.status(401).json({ message: "Security Challenge Failed: Token Expired." });
        }

        // Post-Verification: Clear sensitive state from database
        user.otp = null;
        user.otpExpires = null;
        await user.save();

        // Session Initialization: Sign JWT with User Payload and Role-Based Access (RBAC)
        const secret = process.env.JWT_SECRET || 'fallback_secret';
        const token = jwt.sign(
            { id: user._id, role: user.role }, 
            secret, 
            { expiresIn: '7d' }
        );

        res.json({ 
            token, 
            role: user.role, 
            name: user.name,
            email: user.email,
            id: user.id,
            message: "Authentication Successful: Session Initialized." 
        });

    } catch (err) {
        console.error("Auth Engine Error (VERIFY):", err.message);
        res.status(500).json({ message: "Server Error during authentication." });
    }
});

module.exports = router;