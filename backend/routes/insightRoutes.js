// backend/routes/insightRoutes.js
const express = require('express');
const router = express.Router();
const { getDashboardInsights } = require('../controllers/insightController');
const Attendance = require('../models/Attendance');
const User = require('../models/User');
const Course = require('../models/Course'); 
const { protect } = require('../middleware/authMiddleware'); 

/**
 * Route: GET /dashboard
 * Purpose: Retrieves high-level institutional metrics for the primary dashboard.
 * Middleware: Requires JWT authentication via 'protect'.
 */
router.get('/dashboard', protect, getDashboardInsights);

/**
 * Route: GET /risk-radar
 * Purpose: Generates a comprehensive risk matrix for student performance.
 * Logic: Cross-references course registries with attendance logs to identify low-engagement nodes.
 */
router.get('/risk-radar', protect, async (req, res) => {
    try {
        const { section } = req.query;
        // Hydrating course documents with associated student identity metadata
        const courses = await Course.find({}).populate('students');
        const allAttendances = await Attendance.find({});

        let riskData = [];

        courses.forEach(course => {
            // Section-based segmentation for administrative granular control
            if (section && section !== 'ALL' && course.section !== section) return;

            course.students.forEach(student => {
                let total = 0, present = 0;
                
                // Aggregating attendance status across all historical logs for the student
                allAttendances.forEach(att => {
                    if (att.courseId === course.courseCode && att.section === course.section) {
                        const rec = att.records.find(r => r.studentId.toString() === student._id.toString());
                        if (rec) {
                            total++;
                            // Engagement mapping: Both 'Present' and 'Late' contribute to participation
                            if (['present', 'late'].includes(rec.status.toLowerCase())) present++;
                        }
                    }
                });

                const attPercent = total === 0 ? 0 : Math.round((present / total) * 100);
                const isHighRisk = attPercent < 75;

                // Constructing the analytical response object
                riskData.push({
                    id: `${student._id}-${course.courseCode}`,
                    student: student.name,
                    course: course.courseName,
                    section: student.section || course.section,
                    attendance: `${attPercent}%`,
                    // Grade Projection based on institutional thresholds
                    grade: attPercent >= 75 ? 'A' : (attPercent >= 60 ? 'B' : 'F'),
                    score: Math.max(10, attPercent - 10), // Heuristic-based study score
                    riskLevel: isHighRisk ? 'High Risk' : 'Low Risk',
                    factors: isHighRisk ? ['Frequent absences', 'Missed consecutive classes'] : ['Consistent participation'],
                    interventions: isHighRisk ? ['Schedule 1-on-1 meeting', 'Send formal warning'] : ['Maintain engagement streak']
                });
            });
        });

        res.json(riskData);
    } catch (err) {
        console.error("Telemetry Analysis Error (Risk Radar):", err);
        res.status(500).json({ error: "Risk matrix generation failed" });
    }
});

/**
 * Route: GET /course/:courseId
 * Purpose: Provides deep-dive analytics for a specific academic unit.
 * RBAC: Faculty access is restricted to their specifically assigned sections.
 */
router.get('/course/:courseId', protect, async (req, res) => {
    try {
        const { courseId } = req.params;
        const { role: userRole, id: userId } = req.user;

        let courseQuery = { courseCode: courseId };
        
        // Applying Data Isolation for Faculty users
        if (userRole === 'faculty') {
            courseQuery.faculty = userId; 
        }

        const courses = await Course.find(courseQuery).populate('students');

        if (courses.length === 0) {
            return res.json({ totalSessions: 0, students: [], avgAttendance: 0 });
        }

        // Student de-duplication logic using a Set for registry integrity
        const allowedSections = courses.map(c => c.section);
        let allStudents = [];
        let studentSet = new Set();

        courses.forEach(c => {
            c.students.forEach(student => {
                const sId = student._id.toString();
                if (!studentSet.has(sId)) {
                    studentSet.add(sId);
                    allStudents.push(student);
                }
            });
        });

        // Retrieving session-wise logs filtered by curriculum sections
        const sessions = await Attendance.find({ 
            courseId: courseId,
            section: { $in: allowedSections }
        });

        const totalSessions = sessions.length;

        // Baseline fallback for new courses with zero logged sessions
        if (totalSessions === 0) {
            const defaultData = allStudents.map(s => ({
                _id: s._id,
                id: s.id || '#0000',
                name: s.name,
                section: s.section || 'N/A',
                att: 100, 
                grade: 'N/A', 
                risk: 'Low'
            }));
            return res.json({ totalSessions: 0, students: defaultData, avgAttendance: 100 });
        }

        let totalClassAttendance = 0;

        // Individual Telemetry Calculation
        const studentInsights = allStudents.map(student => {
            let presentCount = 0;
            
            // Filtering sessions specific to the student's operational cluster (Section)
            const studentSessions = sessions.filter(s => s.section === student.section);
            const actualTotalSessions = studentSessions.length || 1; 

            studentSessions.forEach(session => {
                const record = session.records.find(r => r.studentId.toString() === student._id.toString());
                if (record && ['present', 'late'].includes(record.status.toLowerCase())) {
                    presentCount++;
                }
            });

            const attPercentage = Math.round((presentCount / actualTotalSessions) * 100);
            totalClassAttendance += attPercentage;

            return {
                _id: student._id,
                id: student.id || '#0000',
                name: student.name,
                section: student.section, 
                att: attPercentage,
                grade: Math.floor(Math.random() * (95 - 60 + 1)) + 60, // Placeholder for calculated GPA
                risk: attPercentage < 75 ? 'High' : 'Low'
            };
        });

        const avgAttendance = studentInsights.length > 0 
            ? Math.round(totalClassAttendance / studentInsights.length) 
            : 0;

        res.json({ totalSessions, avgAttendance, students: studentInsights });

    } catch (err) {
        console.error("Telemetry Error (Course Insights):", err);
        res.status(500).json({ message: "Institutional server error" });
    }
});

module.exports = router;