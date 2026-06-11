const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const bcrypt = require('bcryptjs');
const Attendance = require('../models/Attendance'); 
const Department = require('../models/Department');
const Section = require('../models/Section'); 
const nodemailer = require('nodemailer');
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');

// Middleware Configuration: Multer for handling multipart/form-data (CSV uploads)
const upload = multer({ dest: 'uploads/' });

/**
 * SMTP Configuration: Nodemailer transporter for automated notifications.
 * Uses system environment variables for secure credential management.
 */
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER, 
        pass: process.env.EMAIL_PASS  
    }
});

// Utility: Returns Today's date in YYYY-MM-DD format (IST Offset)
const getTodayIST = () => {
    const date = new Date();
    date.setUTCHours(date.getUTCHours() + 5);
    date.setUTCMinutes(date.getUTCMinutes() + 30);
    return date.toISOString().split('T')[0];
};

// Utility: Returns Yesterday's date in YYYY-MM-DD format (IST Offset)
const getYesterdayIST = () => {
    const date = new Date();
    date.setUTCHours(date.getUTCHours() + 5);
    date.setUTCMinutes(date.getUTCMinutes() + 30);
    date.setDate(date.getDate() - 1);
    return date.toISOString().split('T')[0];
};

/**
 * Service: Automated Warning Email
 * Purpose: Dispatches high-priority alerts to students falling below the 75% threshold.
 */
const sendWarningEmail = async (studentEmail, studentName, courseCode, attendancePercentage) => {
    const mailOptions = {
        from: `"AcademiaAI Notification" <${process.env.EMAIL_USER}>`,
        to: studentEmail,
        subject: `URGENT: Attendance Warning for ${courseCode}`,
        html: `
            <div style="font-family: sans-serif; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
                <h2 style="color: #ef4444;">Attendance Alert!</h2>
                <p>Hello <b>${studentName}</b>,</p>
                <p>This is an automated warning regarding your attendance in course: <b>${courseCode}</b>.</p>
                <div style="background: #fff5f5; padding: 15px; border-radius: 8px; margin: 20px 0;">
                    <p style="margin: 0; font-size: 18px;">Current Attendance: <span style="color: #e11d48; font-weight: bold;">${attendancePercentage}%</span></p>
                    <p style="margin: 5px 0 0 0; color: #666;">Status: <b>HIGH RISK</b></p>
                </div>
                <p>Please note that maintaining at least <b>75% attendance</b> is mandatory. Kindly meet your course instructor as soon as possible.</p>
                <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;">
                <p style="font-size: 12px; color: #888;">This is a system-generated email from AcademiaAI Portal.</p>
            </div>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        console.log(`Log: Warning dispatched to ${studentEmail}`);
    } catch (err) {
        console.error("Transmission Error (Mail):", err);
    }
};

/**
 * Route: GET /stats
 * Purpose: Aggregates institutional telemetry for the Admin Dashboard.
 */
router.get('/stats', async (req, res) => {
    try {
        const [totalUsers, totalCourses, departments] = await Promise.all([
            User.find({}),
            Course.find({}),
            Department.find({})
        ]);

        const stats = {
            totalStudents: totalUsers.filter(u => u.role === 'student').length,
            totalFaculty: totalUsers.filter(u => u.role === 'faculty').length,
            totalCourses: totalCourses.length,
            totalDepartments: departments.length,
            recentUsers: totalUsers.slice(-5).reverse()
        };
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: "Institutional telemetry retrieval failed" });
    }
});

/**
 * Route: POST /add-faculty
 * Purpose: Manual provisioning of Faculty accounts with system-generated IDs.
 */
router.post('/add-faculty', async (req, res) => {
    try {
        const { name, email, department, section } = req.body;
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) return res.status(400).json({ error: "Identity already registered" });

        const hashedPassword = await bcrypt.hash("password123", 10);
        const sysId = 'F' + Math.floor(1000 + Math.random() * 9000);

        const faculty = await User.create({
            name, email: email.toLowerCase().trim(), department, section: section || '',
            password: hashedPassword, role: 'faculty',
            initials: name.split(' ').map(n => n[0]).join('').toUpperCase(),
            id: sysId
        });
        res.status(201).json({ message: "Faculty provisioned successfully", faculty });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

/**
 * Route: POST /add-student
 * Purpose: Manual provisioning of Student accounts.
 */
router.post('/add-student', async (req, res) => {
    try {
        const { name, email, department, batch, section } = req.body;
        const existing = await User.findOne({ email: email.toLowerCase().trim() });
        if (existing) return res.status(400).json({ error: "Identity already registered" });

        const hashedPassword = await bcrypt.hash("student123", 10);
        const sysId = 'S' + Math.floor(10000 + Math.random() * 90000);

        const student = await User.create({
            name, email: email.toLowerCase().trim(), department, section: section || '',
            batch: batch || '2026', password: hashedPassword, role: 'student',
            initials: name.split(' ').map(n => n[0]).join('').toUpperCase(),
            id: sysId
        });
        res.status(201).json({ message: "Student provisioned successfully", student });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Route: DELETE /delete-user/:id - Permanent removal of user identity
router.delete('/delete-user/:id', async (req, res) => {
    try {
        await User.findByIdAndDelete(req.params.id);
        res.json({ message: "Identity purged from registry" });
    } catch (err) {
        res.status(500).json({ error: "Purge operation failed" });
    }
});

// Route: PUT /edit-user/:id - Identity metadata modification
router.put('/edit-user/:id', async (req, res) => {
    try {
        const { name, email, department, section, batch, role } = req.body;
        const existingUser = await User.findOne({ email: email.toLowerCase().trim(), _id: { $ne: req.params.id } });
        if (existingUser) return res.status(400).json({ error: "Conflict: Email used by another node." });

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { name, email: email.toLowerCase().trim(), department, section: section || '', batch: batch || '', role },
            { returnDocument: 'after' }
        );
        res.json({ message: "Identity updated", user: updatedUser });
    } catch (err) { res.status(500).json({ error: "Update operation failed" }); }
});

// Route: GET /users - Fetches entire institutional registry
router.get('/users', async (req, res) => {
    try {
        const users = await User.find({}).select('-password').sort({ role: 1, name: 1 });
        res.json(users);
    } catch (err) { res.status(500).json({ error: "Registry retrieval failed" }); }
});

// Route: GET /faculty-list - Minimalist faculty data for course allocation
router.get('/faculty-list', async (req, res) => {
    try {
        const faculty = await User.find({ role: 'faculty' }).select('name _id');
        res.json(faculty);
    } catch (err) { res.status(500).json([]); }
});

/**
 * Curriculum Management Routes
 * Purpose: Handles creation, updates, and roster synchronization for academic units.
 */
router.post('/create-course', async (req, res) => {
    try {
        const { courseCode, courseName, facultyId, semester, classTiming, section } = req.body;
        const newCourse = await Course.create({
            courseCode, courseName, faculty: facultyId, semester, classTiming, section, status: 'Active'
        });
        res.status(201).json(newCourse);
    } catch (err) { res.status(400).json({ error: err.message }); }
});

router.put('/edit-course/:id', async (req, res) => {
    try {
        const updatedCourse = await Course.findByIdAndUpdate(
            req.params.id,
            { ...req.body },
            { returnDocument: 'after' }
        );
        res.json({ message: "Curriculum updated", course: updatedCourse });
    } catch (err) { res.status(500).json({ error: "Course modification failed" }); }
});

router.get('/courses-all', async (req, res) => {
    try {
        const courses = await Course.find({}).populate('faculty', 'name');
        res.json(courses);
    } catch (err) { res.status(500).json([]); }
});

router.post('/assign-students', async (req, res) => {
    try {
        const { courseCode, studentIds } = req.body;
        const course = await Course.findOneAndUpdate(
            { courseCode }, 
            { students: studentIds }, 
            { returnDocument: 'after' }
        );
        res.json({ message: "Roster synchronized successfully", course });
    } catch (err) { res.status(500).json({ error: "Roster synchronization failed" }); }
});

router.delete('/delete-course/:courseCode', async (req, res) => {
    try {
        await Course.findOneAndDelete({ courseCode: req.params.courseCode });
        res.json({ message: "Curriculum purged successfully" });
    } catch (err) { res.status(500).json({ error: err.message }); }
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

// Organization Metadata Routes: Department & Section definitions
router.get('/departments', async (req, res) => {
    try {
        const depts = await Department.find().sort({ name: 1 });
        res.json(depts);
    } catch (err) { res.status(500).json([]); }
});

router.post('/add-department', async (req, res) => {
    try {
        const newDept = new Department({ name: req.body.name });
        await newDept.save();
        res.json({ message: "Department committed to registry" });
    } catch (err) { res.status(500).json({ error: "Operation failed" }); }
});

router.get('/sections', async (req, res) => {
    try {
        const sections = await Section.find().sort({ name: 1 });
        res.json(sections);
    } catch (err) { res.status(500).json([]); }
});

router.post('/add-section', async (req, res) => {
    try {
        const newSection = new Section({ name: req.body.name });
        await newSection.save();
        res.json({ message: "Section committed to registry" });
    } catch (err) { res.status(500).json({ error: "Operation failed" }); }
});

/**
 * Route: POST /bulk-upload
 * Purpose: Processes high-volume user imports via CSV telemetry.
 * Logic: Stream parsing, deduplication check, and automated identity provisioning.
 */
router.post('/bulk-upload', upload.single('file'), (req, res) => {
    const results = [];
    const role = req.body.role;
    if (!req.file) return res.status(400).json({ message: "Null payload: No file detected" });

    fs.createReadStream(req.file.path).pipe(csv()).on('data', (data) => results.push(data)).on('end', async () => {
        try {
            let count = 0;
            for (const row of results) {
                if (!row.email || !row.name) continue; 

                const email = row.email.trim().toLowerCase();
                const sectionName = row.section ? row.section.trim().toUpperCase() : '';

                if (sectionName) {
                    await Section.findOneAndUpdate({ name: sectionName }, { name: sectionName }, { upsert: true });
                }

                const exists = await User.findOne({ email });
                if (!exists) {
                    const pass = role === 'faculty' ? 'password123' : 'student123';
                    const hashed = await bcrypt.hash(pass, 10);
                    const sysId = role === 'faculty' ? 'F'+Math.floor(1000+Math.random()*9000) : 'S'+Math.floor(10000+Math.random()*90000);
                    
                    await User.create({
                        name: row.name, email, department: row.department, batch: row.batch || '', 
                        section: sectionName, role, password: hashed, id: sysId,
                        initials: row.name.split(' ').map(n => n[0]).join('').toUpperCase()
                    });
                    count++;
                }
            }
            fs.unlinkSync(req.file.path);
            res.json({ message: `Batch process complete. Provisioned ${count} new identities.` });
        } catch (err) { res.status(500).json({ error: "Batch processing failed" }); }
    });
});

/**
 * Core Operational Route: /mark-attendance-secure
 * Purpose: Atomic write operation for attendance logs.
 * Features: 48-hour operational window for Faculty, Background predictive analytics, and Auto-trigger for Warning Emails.
 */
router.post('/mark-attendance-secure', async (req, res) => {
    try {
        const { courseId, section, date, records, userRole } = req.body;
        const today = getTodayIST();
        const yesterday = getYesterdayIST();

        // Enforcing Temporal Security Policy
        if (userRole === 'faculty' && date !== today && date !== yesterday) {
            return res.status(403).json({ message: "Temporal Lock: Access restricted to a 48h window." });
        }

        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        // Atomic Upsert Operation
        await Attendance.findOneAndUpdate(
            { courseId, section: section || '', date: checkDate },
            { records, markedBy: userRole.toUpperCase() },
            { upsert: true, returnDocument: 'after' }
        );

        res.json({ message: "Telemetry synchronized. Risk-radar engine backgrounded." });

        /**
         * Background Predictive Engine:
         * Calculates course-wide engagement and triggers SMTP alerts for high-risk students.
         */
        (async () => {
            try {
                const allSessions = await Attendance.find({ courseId });

                for (let record of records) {
                    const studentId = record.studentId;
                    let totalClasses = 0;
                    let presentClasses = 0;

                    allSessions.forEach(session => {
                        const sRec = session.records.find(r => r.studentId.toString() === studentId.toString());
                        if (sRec) {
                            totalClasses++;
                            if (sRec.status === 'Present') presentClasses++;
                        }
                    });

                    const percentage = totalClasses === 0 ? 0 : Math.round((presentClasses / totalClasses) * 100);

                    // Threshold Verification & Alert Dispatch
                    if (percentage < 75 && totalClasses >= 3) { 
                        const studentData = await User.findById(studentId);
                        if (studentData && studentData.email) {
                            sendWarningEmail(studentData.email, studentData.name, courseId, percentage);
                        }
                    }
                }
            } catch (bgError) { console.error("Risk-Radar Engine Failure:", bgError.message); }
        })(); 

    } catch (err) { 
        if (!res.headersSent) res.status(500).json({ error: "System failure during telemetry commit." }); 
    }
});

module.exports = router;