const Attendance = require('../models/Attendance');
const Course = require('../models/Course');
const User = require('../models/User');

/**
 * Controller: getDashboardInsights
 * Purpose: Provides high-level analytical data for Admin and Faculty dashboards.
 * Logic: Segregates data flow based on User Role (RBAC).
 */
exports.getDashboardInsights = async (req, res) => {
    try {
        const systemId = req.user.id; // System-generated ID (e.g., F5086)
        const userRole = req.user.role; 

        // ---------------------------------------------------------
        // FACULTY ANALYTICS FLOW
        // ---------------------------------------------------------
        if (userRole === 'faculty') {
            // 1. Resolve System ID to MongoDB Object ID to perform relational queries
            const teacherRecord = await User.findOne({ id: systemId });
            
            if (!teacherRecord) {
                return res.status(404).json({ success: false, message: "Faculty record not found in registry" });
            }

            // 2. Fetch all courses assigned to this specific faculty member
            const allottedCourses = await Course.find({ faculty: teacherRecord._id });
            
            if (allottedCourses.length === 0) {
                return res.status(200).json({ 
                    success: true, 
                    role: 'faculty',
                    message: "No sections currently assigned.", 
                    insights: null 
                });
            }

            // 3. Create a composite filter to fetch attendance for specific course-section pairs
            const sectionFilters = allottedCourses.map(course => ({
                courseId: course.courseCode,
                section: course.section
            }));

            // 4. Retrieve telemetry data and pass to the analytical engine
            const teacherAttendanceData = await Attendance.find({ $or: sectionFilters });
            const insights = generateAIInsights(teacherAttendanceData);

            return res.status(200).json({
                success: true,
                role: 'faculty',
                allottedSections: allottedCourses.length,
                insights: insights
            });
        }

        // ---------------------------------------------------------
        // ADMINISTRATIVE (GLOBAL) FLOW
        // ---------------------------------------------------------
        if (userRole === 'admin') {
            const requestedSection = req.query.section; 
            let query = {};
            
            // Allow global view or filtered view based on query parameters
            if (requestedSection) query.section = requestedSection;

            const globalAttendanceData = await Attendance.find(query);
            const insights = generateAIInsights(globalAttendanceData);

            return res.status(200).json({
                success: true,
                role: 'admin',
                viewingSection: requestedSection || 'ALL',
                insights: insights
            });
        }

        return res.status(403).json({ success: false, message: "Access Denied: Unauthorized Role" });

    } catch (error) {
        console.error("Insights Engine Error:", error);
        res.status(500).json({ success: false, message: "Internal Analytics Server Error" });
    }
};

/**
 * Helper: generateAIInsights
 * Purpose: Aggregates raw attendance logs into meaningful KPI metrics.
 * Calculation: Processes nested arrays to determine overall engagement levels.
 */
const generateAIInsights = (attendanceRecords) => {
    let totalClasses = attendanceRecords.length;
    let totalPresents = 0;
    let totalAbsents = 0;

    // Iterative aggregation of student status across all retrieved sessions
    attendanceRecords.forEach(session => {
        session.records.forEach(student => {
            if (student.status === 'Present') totalPresents++;
            if (student.status === 'Absent') totalAbsents++;
        });
    });

    const totalRecords = totalPresents + totalAbsents;
    const attendancePercentage = totalRecords === 0 ? 0 : ((totalPresents / totalRecords) * 100).toFixed(2);

    return {
        totalSessionsAnalyzed: totalClasses,
        overallAttendancePercentage: `${attendancePercentage}%`,
        totalPresents,
        totalAbsents,
        // Predictive Warning: Flags institutional risk if engagement falls below 75%
        warning: attendancePercentage < 75 && totalClasses > 0 
            ? "CRITICAL: Engagement threshold below 75%!" 
            : "Operational Status: Nominal"
    };
};