const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const Attendance = require('../models/Attendance');
const Doubt = require('../models/Doubt');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// ==========================================
// 1. STUDENT DASHBOARD MODULE
// ==========================================

/**
 * Route: GET /dashboard/:email
 * Purpose: Aggregates student profile data, curriculum details, and AI behavioral insights.
 * Analytics logic: Calculates course-wise and cumulative attendance percentages.
 */
router.get('/dashboard/:email', async (req, res) => {
    try {
        // Resolve student identity and enrolled curriculum
        const student = await User.findOne({ email: req.params.email, role: 'student' });
        if (!student) return res.status(404).json({ message: "Student identity not found." });

        const enrolledCourses = await Course.find({ students: student._id })
            .populate('faculty', 'name');

        let totalSessions = 0;
        let presentCount = 0;
        let absentCount = 0;
        let courseDetails = [];

        for (const course of enrolledCourses) {
            /**
             * Telemetry Filtering: 
             * Retrieves logs mapped to the student's section or institutional global tags.
             */
            const attendances = await Attendance.find({ 
                courseId: course.courseCode,
                $or: [{ section: student.section }, { section: 'ALL' }, { section: '' }]
            });

            let courseTotal = 0;
            let coursePresent = 0;

            attendances.forEach(att => {
                const record = att.records.find(r => r.studentId.toString() === student._id.toString());
                if (record) {
                    totalSessions++;
                    courseTotal++;
                    // Status Mapping: Baseline engagement analysis
                    if (record.status === 'Present') { 
                        presentCount++; 
                        coursePresent++; 
                    } else { 
                        // Note: 'Late' or 'Absent' entries are categorized as negative engagement for calculation
                        absentCount++; 
                    }
                }
            });

            const coursePercentage = courseTotal === 0 ? 0 : Math.round((coursePresent / courseTotal) * 100);

            courseDetails.push({
                courseId: course._id,
                courseCode: course.courseCode,
                courseName: course.courseName,
                facultyName: course.faculty ? course.faculty.name : 'Unassigned',
                facultyMongoId: course.faculty ? course.faculty._id : null, 
                classTiming: course.classTiming || 'Not Scheduled',
                semester: course.semester,
                attendancePercentage: coursePercentage,
                totalClasses: courseTotal,
                presentClasses: coursePresent 
            });
        }

        const overallPercentage = totalSessions === 0 ? 0 : Math.round((presentCount / totalSessions) * 100);

        /**
         * AI Study Companion Engine:
         * Generates context-aware feedback based on institutional engagement thresholds.
         */
        let aiInsights = { strengths: [], focusAreas: [], studyPlan: [], quote: "" };
        if (totalSessions === 0) {
            aiInsights.strengths = ["Roster synchronized: Standby mode"];
            aiInsights.focusAreas = ["Review initial curriculum mapping"];
            aiInsights.studyPlan = ["Analyze syllabus for upcoming modules"];
            aiInsights.quote = `"The secret of getting ahead is getting started."`;
        } else if (overallPercentage >= 80) {
            aiInsights.strengths = ["Exceptional participation trajectory"];
            aiInsights.focusAreas = ["Lead peer-learning initiatives"];
            aiInsights.studyPlan = ["Engage in advanced research projects"];
            aiInsights.quote = `"Consistency is the bridge between goals and accomplishment."`;
        } else if (overallPercentage >= 65) {
            aiInsights.strengths = ["Satisfactory engagement baseline"];
            aiInsights.focusAreas = ["Optimize attendance to clear 75% threshold"];
            aiInsights.studyPlan = ["Avoid further session overlaps"];
            aiInsights.quote = `"Success is the sum of small efforts repeated daily."`;
        } else {
            aiInsights.strengths = ["Intervention required"];
            aiInsights.focusAreas = ["Critical engagement shortage"];
            aiInsights.studyPlan = ["Mandatory academic counseling recommended"];
            aiInsights.quote = `"The only mistake is the one from which we learn nothing."`;
        }

        res.json({
            student: {
                name: student.name, email: student.email, department: student.department,
                batch: student.batch, initials: student.initials, id: student.id,
                section: student.section, mongoId: student._id 
            },
            stats: { overallPercentage, presentCount, absentCount, totalSessions },
            enrolledCourses: courseDetails,
            aiInsights
        });

    } catch (error) {
        console.error("Analytical Engine Error:", error);
        res.status(500).json({ error: "Failed to synthesize dashboard telemetry." });
    }
});

// ==========================================
// 2. ATTENDANCE CHRONOLOGY (Modal Data)
// ==========================================

/**
 * Route: GET /attendance-history/:courseCode/:studentId
 * Purpose: Provides a time-series log of student participation for specific courses.
 */
router.get('/attendance-history/:courseCode/:studentId', async (req, res) => {
    try {
        const { courseCode, studentId } = req.params;
        const history = await Attendance.find({ courseId: courseCode }).sort({ date: -1 });

        const formattedHistory = history.map(session => {
            const record = session.records.find(r => r.studentId.toString() === studentId);
            return record ? { date: session.date, status: record.status } : null;
        }).filter(Boolean);

        res.json(formattedHistory);
    } catch (err) {
        res.status(500).json({ error: "Chronology retrieval failed." });
    }
});

// ==========================================
// 3. STUDENT GRIEVANCE PORTAL
// ==========================================

// Route: POST /grievance/submit - Transmits student queries to faculty leads
router.post('/grievance/submit', async (req, res) => {
    try {
        const { studentId, facultyId, courseCode, question } = req.body;
        if(!studentId || !facultyId || !question) {
            return res.status(400).json({ message: "Validation Error: Missing query parameters." });
        }
        const newDoubt = await Doubt.create({ studentId, facultyId, courseCode, question });
        res.json({ message: "Grievance logged successfully.", doubt: newDoubt });
    } catch (err) {
        res.status(500).json({ error: "Submission transaction failed." });
    }
});

// Route: GET /grievance/status/:studentId - Retrieves historical communication logs
router.get('/grievance/status/:studentId', async (req, res) => {
    try {
        const doubts = await Doubt.find({ studentId: req.params.studentId })
            .populate('facultyId', 'name')
            .sort({ createdAt: -1 });
        res.json(doubts);
    } catch (err) {
        res.status(500).json({ error: "Registry sync failed." });
    }
});

// ==========================================
// 4. SECURE OPTICAL AUTHENTICATION (QR)
// ==========================================

/**
 * Route: POST /mark-attendance-qr
 * Security Protocol:
 * 1. Token Verification: Validates short-lived JWT dispatched from faculty terminal.
 * 2. Identity Resolution: Cross-checks student ID and email consistency.
 * 3. Atomic Log: Upserts attendance record to prevent duplicate entries.
 */
router.post('/mark-attendance-qr', async (req, res) => {
    try {
        const { token, studentId, email } = req.body;

        // Signature Validation: Verifying the authenticity of the faculty QR stream
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (err) {
            return res.status(400).json({ message: "Verification Failure: Expired or Malformed Token." });
        }

        const { courseCode, facultyId} = decoded;

        // Access Control: Validating student credentials
        const student = await User.findById(studentId);
        if (!student || student.email !== email) {
            return res.status(401).json({ message: "Security Breach: Identity mismatch detected." });
        }

        // Session Locking: Locating the current day's operational window
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        
        let session = await Attendance.findOne({ 
            courseId: courseCode, 
            date: { $gte: todayStart } 
        });

        // Initialize session if no log exists for the current curriculum unit
        if (!session) {
            session = new Attendance({
                courseId: courseCode,
                date: new Date(),
                section: student.section, 
                markedBy: facultyId,
                records: []
            });
        }

        // Duplicate Check: Ensuring single-entry integrity per identity
        const alreadyMarked = session.records.find(r => r.studentId.toString() === studentId);
        if (alreadyMarked) {
            return res.status(400).json({ message: "Audit Conflict: Attendance already registered." });
        }

        session.records.push({ studentId, status: 'Present' });
        await session.save();

        res.json({ message: "Authentication Successful: Registry synchronized.", courseCode });

    } catch (error) {
        res.status(500).json({ error: "Security Handshake Failed." });
    }
});

module.exports = router;