const express = require('express');
const router = express.Router();
const Course = require('../models/Course');
const User = require('../models/User');
const Attendance = require('../models/Attendance'); 
const Doubt = require('../models/Doubt'); 
const Groq = require('groq-sdk');
const jwt = require('jsonwebtoken');
require('dotenv').config();

// AI Engine Initialization: Groq SDK for Predictive Analytics
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// ==========================================
// 1. CURRICULUM ENROLLMENT MODULE
// ==========================================

/**
 * Route: POST /enroll
 * Purpose: Assigns students to a specific academic unit.
 * Logic: Prevents duplicate enrollment by filtering existing student ObjectIDs.
 */
router.post('/enroll', async (req, res) => {
    try {
        const { courseCode, studentIds } = req.body;
        const course = await Course.findOne({ courseCode });
        if (!course) return res.status(404).json({ message: "Academic unit not found" });

        const existingIds = course.students.map(id => id.toString());
        const newIds = studentIds.filter(id => !existingIds.includes(id));

        course.students.push(...newIds); 
        await course.save();

        res.json({ message: "Registry updated: Students enrolled successfully" });
    } catch (err) { res.status(500).json({ error: "Enrollment transaction failed" }); }
});

/**
 * Route: POST /unenroll
 * Purpose: Removes a student identity from the curriculum roster.
 */
router.post('/unenroll', async (req, res) => {
    try {
        const { courseCode, studentId } = req.body;
        const course = await Course.findOne({ courseCode });
        if (!course) return res.status(404).json({ message: "Academic unit not found" });

        course.students = course.students.filter(id => id.toString() !== studentId);
        await course.save();

        res.json({ message: "Registry updated: Student identity unenrolled" });
    } catch (err) { res.status(500).json({ error: "Unenrollment transaction failed" }); }
});

// ==========================================
// 2. ANALYTICS & DASHBOARD TELEMETRY
// ==========================================

async function getTeacherStatsData(email) {
    const teacher = await User.findOne({ email });
    if (!teacher) return null;

    const courses = await Course.find({ faculty: teacher._id });
    const allAttendance = await Attendance.find({ courseId: { $in: courses.map(c => c.courseCode) } });
    
    let studentSet = new Set();
    let alertsCount = 0;
    let totalAttPercentage = 0;
    let validStudents = 0;

    for (const course of courses) {
        if (course.students) {
            course.students.forEach(s => {
                const studentId = s.toString();
                if (!studentSet.has(studentId)) {
                    studentSet.add(studentId);
                    let totalClasses = 0;
                    let presentCount = 0;

                    allAttendance.forEach(att => {
                        if (att.courseId === course.courseCode && (att.section === course.section || att.section === '')) {
                            const record = att.records.find(r => r.studentId.toString() === studentId);
                            if (record) {
                                totalClasses++;
                                if (record.status === 'Present') presentCount++;
                            }
                        }
                    });
                    
                    const att = totalClasses === 0 ? 0 : Math.round((presentCount / totalClasses) * 100);
                    totalAttPercentage += att;
                    validStudents++;
                    // Risk Factor: Student flagged if attendance < 75% over a 3-session baseline
                    if (totalClasses >= 3 && att < 75) alertsCount++; 
                }
            });
        }
    }

    return {
        teacher,
        courses,
        totalStudents: studentSet.size,
        avgAttendance: validStudents > 0 ? Math.floor(totalAttPercentage / validStudents) : 0,
        alertsCount
    };
}

/**
 * Route: GET /teacher-stats/:email
 * Purpose: Generates high-level KPIs for the Faculty Dashboard.
 * Logic: Aggregates unique student count and calculates institutional average attendance.
 */
router.get('/teacher-stats/:email', async (req, res) => {
    try {
        const stats = await getTeacherStatsData(req.params.email);
        if (!stats) return res.status(404).json({ message: "Faculty identity resolution failed" });

        res.json({
            teacherMongoId: stats.teacher._id.toString(),
            activeClasses: stats.courses.length,
            totalStudents: stats.totalStudents,
            avgAttendance: stats.avgAttendance, 
            aiAlerts: stats.alertsCount
        });
    } catch (err) { res.status(500).json({ error: "Telemetry aggregation failed" }); }
});

/**
 * Analytical Data Endpoint:
 * Fetches cross-session attendance statistics for all students under a specific faculty.
 */
router.get('/teacher-students-stats/:email', async (req, res) => {
    try {
        const teacher = await User.findOne({ email: req.params.email });
        if (!teacher) return res.status(404).json({ message: "Entity not found" });

        const courses = await Course.find({ faculty: teacher._id }).populate('students');
        const allAttendance = await Attendance.find({});

        let studentsSummary = [];
        courses.forEach(course => {
            course.students.forEach(student => {
                let totalSessions = 0;
                let presentSessions = 0;
                allAttendance.forEach(session => {
                    if (session.courseId === course.courseCode && session.section === course.section) {
                        const record = session.records.find(r => r.studentId.toString() === student._id.toString());
                        if (record) {
                            totalSessions++;
                            if (record.status === 'Present') presentSessions++;
                        }
                    }
                });
                const percentage = totalSessions === 0 ? 0 : Math.round((presentSessions / totalSessions) * 100);
                studentsSummary.push({
                    _id: student._id, name: student.name, id: student.id, course: course.courseCode, section: course.section,
                    attendance: percentage, totalClasses: totalSessions, presentClasses: presentSessions,
                    risk: percentage < 75 ? 'High Risk' : 'Healthy Standing'
                });
            });
        });
        res.json(studentsSummary);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Route: GET /teacher/:email
 * Purpose: Retrieves assigned curriculum units for the authenticated faculty.
 */
router.get('/teacher/:email', async (req, res) => {
    try {
        const teacher = await User.findOne({ email: req.params.email });
        if (!teacher) return res.status(404).json({ message: "Faculty identity not found" });

        const courses = await Course.find({ faculty: teacher._id }).populate('students');
        
        const formattedCourses = courses.map(c => ({
            courseCode: c.courseCode,
            courseName: c.courseName,
            section: c.section,
            studentsEnrolled: c.students ? c.students.length : 0,
            students: c.students,
            nextClass: c.nextClass,
            semester: c.semester,
            classTiming: c.classTiming 
        }));
        res.json(formattedCourses);
    } catch (err) { res.status(500).json({ message: "Curriculum retrieval error" }); }
});

// ==========================================
// 3. COMMUNICATION & SECURITY MODULES
// ==========================================

/**
 * Route: GET /generate-qr/:courseCode/:facultyId
 * Security: Generates short-lived (15s) JWT tokens for proxy-proof attendance scanning.
 */
router.get('/generate-qr/:courseCode/:facultyId', async (req, res) => {
    try {
        const { courseCode, facultyId } = req.params;
        const token = jwt.sign(
            { courseCode, facultyId }, 
            process.env.JWT_SECRET, 
            { expiresIn: '15s' } 
        );
        res.json({ token });
    } catch (error) { res.status(500).json({ error: "Security Token generation failed" }); }
});

/**
 * Route: GET /live-roster/:courseCode
 * Telemetry: Provides real-time present count and student metadata for active sessions.
 */
router.get('/live-roster/:courseCode', async (req, res) => {
    try {
        const { courseCode } = req.params;
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const session = await Attendance.findOne({ 
            courseId: courseCode, 
            date: { $gte: todayStart } 
        }).populate({
            path: 'records.studentId', 
            select: 'name email initials section' 
        });

        if (!session || !session.records || session.records.length === 0) {
            return res.json({ message: "Log inactive", records: [], presentCount: 0 });
        }

        const formattedRecords = session.records.map(record => ({
            id: record.studentId._id,
            name: record.studentId.name,
            email: record.studentId.email,
            initials: record.studentId.initials || record.studentId.name.charAt(0),
            status: record.status,
            time: record._id.getTimestamp() 
        }));

        res.json({ presentCount: formattedRecords.length, records: formattedRecords });
    } catch (err) { res.status(500).json({ error: "Live telemetry stream interrupted" }); }
});

// ==========================================
// 4. GENERATIVE AI ENGINE (GROQ)
// ==========================================

/**
 * Route: GET /generate-ai-insight/:email
 * Logic: Aggregates real-time metrics and prompts LLaMA 3.1 for behavioral insights.
 * Priority: Focuses on At-Risk student warnings if threshold violations are detected.
 */
router.get('/generate-ai-insight/:email', async (req, res) => {
    try {
        const stats = await getTeacherStatsData(req.params.email);
        if (!stats) return res.status(404).json({ error: "Identity resolution failed" });

        const pendingDoubts = await Doubt.countDocuments({ facultyId: stats.teacher._id, status: 'Pending' });
        const atRiskStudents = stats.alertsCount; 

        const prompt = `
        System Profile: AcademiaAI assistant for Professor ${stats.teacher.name}.
        Input Metrics:
        - Active Units: ${stats.courses.length}
        - Pending Grievances: ${pendingDoubts}
        - Students At-Risk (<75%): ${atRiskStudents}
        
        Mandate: Provide a professional, actionable 2-sentence insight.
        If students are at-risk, focus on intervention protocols. If engagement is stable, focus on grievance management.
        Constraint: Max 30 words. Technical tone.
        `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [{ role: 'user', content: prompt }],
            model: 'llama-3.1-8b-instant', 
            temperature: 0.2, 
        });

        const aiResponse = chatCompletion.choices[0]?.message?.content || "Metrics synchronized. System performing within nominal parameters.";

        res.json({ 
            insight: aiResponse,
            alertCount: atRiskStudents 
        });

    } catch (error) {
        console.error("AI Engine Error:", error);
        res.json({ insight: "Analytical Engine processing telemetry. (Engine Syncing)" });
    }
});

module.exports = router;