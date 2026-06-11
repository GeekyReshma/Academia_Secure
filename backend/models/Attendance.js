const mongoose = require('mongoose');

/**
 * Schema: Attendance
 * Description: Stores session-wise attendance logs for specific courses and sections.
 * Features: Supports multi-section filtering and tracks the origin of the attendance entry.
 */
const attendanceSchema = new mongoose.Schema({
    // Unique identifier for the course (e.g., CS101)
    courseId: { 
        type: String, 
        required: true 
    },

    /**
     * Target Section:
     * Represents the specific student cluster (e.g., '6P', 'A').
     * Default is an empty string to accommodate global/merged section attendance logs.
     */
    section: { 
        type: String, 
        default: '' 
    },

    // Timestamp of the academic session
    date: { 
        type: Date, 
        required: true 
    },

    /**
     * Entry Authority:
     * Tracks the role or identity of the person marking the attendance.
     * Changed to String to allow flexibility for 'Faculty' or 'Admin' override labels.
     */
    markedBy: {
        type: String, 
        required: true 
    },

    /**
     * Registry Records:
     * An array of sub-documents containing individual student participation status.
     */
    records: [{
        // Reference link to the User collection for relational data fetching
        studentId: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: 'User' 
        },
        // Denormalized name field for rapid UI rendering without deep population
        name: String,
        status: { 
            type: String, 
            enum: ['Present', 'Absent', 'Late'], 
            required: true 
        }
    }]
}, { 
    // Automatically creates 'createdAt' and 'updatedAt' fields for audit trails
    timestamps: true 
});

module.exports = mongoose.model('Attendance', attendanceSchema);