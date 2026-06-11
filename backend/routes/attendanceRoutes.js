const express = require('express');
const router = express.Router();
const Attendance = require('../models/Attendance');
const Course = require('../models/Course');

/**
 * Utility: getTodayIST
 * Returns current date in YYYY-MM-DD format based on Indian Standard Time (UTC+5:30).
 * Ensuring consistency between server time and local institutional operations.
 */
const getTodayIST = () => {
    const date = new Date();
    date.setUTCHours(date.getUTCHours() + 5);
    date.setUTCMinutes(date.getUTCMinutes() + 30);
    return date.toISOString().split('T')[0];
};

/**
 * Utility: getYesterdayIST
 * Returns the previous date in YYYY-MM-DD format (IST).
 * Used for the 48-hour operational window policy.
 */
const getYesterdayIST = () => {
    const date = new Date();
    date.setUTCHours(date.getUTCHours() + 5);
    date.setUTCMinutes(date.getUTCMinutes() + 30);
    date.setDate(date.getDate() - 1); 
    return date.toISOString().split('T')[0];
};

/**
 * Route: POST /mark
 * Purpose: Commits or updates attendance telemetry for a specific course session.
 * Security: Implements a temporal "Hard-Lock" for faculty roles to prevent archival tampering.
 */
router.post('/mark', async (req, res) => {
    try {
        const { courseId, section, date, records, userRole } = req.body;

        // Validating payload integrity
        if (!courseId || !date || !records) {
            return res.status(400).json({ message: "Payload Error: Missing required telemetry fields" });
        }

        /**
         * Temporal Security Policy:
         * Restricted access: Faculty can only modify logs for the current or previous date.
         * Administrative Override: Admin role is exempt from temporal restrictions.
         */
        const todayIST = getTodayIST();
        const yesterdayIST = getYesterdayIST();
        
        if (userRole === 'faculty' && date !== todayIST && date !== yesterdayIST) {
            return res.status(403).json({ 
                message: `Access Denied: Operational window restricted to Today (${todayIST}) or Yesterday (${yesterdayIST}).` 
            });
        }

        // Normalizing data stream for persistence
        const formattedRecords = records.map(student => ({
            studentId: student.studentId,
            name: student.name,
            status: student.status
        }));

        // Ensuring Date precision (stripping time metadata)
        const checkDate = new Date(date);
        checkDate.setHours(0, 0, 0, 0);

        /**
         * Atomic Upsert Logic:
         * Checks for existing session logs based on Course, Section, and Date.
         * Prevents duplicate session entries for the same academic unit.
         */
        let existingRecord = await Attendance.findOne({ 
            courseId, 
            section: section || '', 
            date: checkDate 
        });

        if (existingRecord) {
            // Update existing telemetry
            existingRecord.records = formattedRecords;
            existingRecord.markedBy = userRole === 'admin' ? 'Admin' : 'Faculty';
            await existingRecord.save();
            return res.json({ message: "Telemetry updated successfully" });
        } else {
            // Initialize new log entry
            const newAttendance = new Attendance({
                courseId,
                section: section || '', 
                date: checkDate,
                records: formattedRecords,
                markedBy: userRole === 'admin' ? 'Admin' : 'Faculty'
            });
            await newAttendance.save();
            return res.status(201).json({ message: "Attendance session initialized" });
        }

    } catch (err) {
        console.error("Attendance Sync Error:", err.message);
        res.status(500).json({ message: "Internal Server Error during synchronization" });
    }
});

/**
 * Route: GET /students/:courseCode
 * Purpose: Retrieves student roster for a specific curriculum unit.
 * Query Params: Supports 'section' filtering (comma-separated list or 'ALL').
 */
router.get('/students/:courseCode', async (req, res) => {
    try {
        const { section } = req.query; 
        
        // Fetching curriculum data and populating student sub-documents
        const course = await Course.findOne({ courseCode: req.params.courseCode })
                                   .populate('students', 'name id email section');
        
        if (!course) return res.status(404).json({ message: "Curriculum unit not found" });

        let filteredStudents = course.students;

        /**
         * Multi-Section Filter Logic:
         * Parses comma-separated section strings to aggregate rosters from multiple clusters.
         */
        if (section && section !== 'ALL') {
            const sectionArray = section.split(','); 
            filteredStudents = course.students.filter(s => sectionArray.includes(s.section));
        }

        // Transforming data for the Attendance Terminal UI
        const roster = filteredStudents.map(s => ({
            _id: s._id,
            name: s.name,
            studentID: s.id || '#N/A',
            section: s.section || 'NA', 
            status: 'Present' // Default baseline status
        }));

        res.json(roster);
    } catch (err) {
        console.error("Roster Retrieval Error:", err.message);
        res.status(500).json({ message: "Registry Error: Failed to fetch course roster" });
    }
});

module.exports = router;