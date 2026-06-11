const mongoose = require('mongoose');

/**
 * Schema: Course
 * Description: Manages academic curriculum units, faculty assignments, and student enrollments.
 * Relationships: 
 * - Linked to 'User' collection for faculty (One-to-One)
 * - Linked to 'User' collection for students (One-to-Many)
 */
const courseSchema = new mongoose.Schema({
  // Unique academic identifier (e.g., CS-401)
  courseCode: { 
    type: String, 
    required: true 
  }, 

  // Formal name of the curriculum unit
  courseName: { 
    type: String, 
    required: true 
  },

  // Specific student cluster identifier (e.g., 6P, Sec-A)
  section: { 
    type: String, 
    required: true 
  }, 

  // Reference to the primary instructor (Faculty member)
  faculty: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },

  // Roster of enrolled students associated with this course instance
  students: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  }], 

  // Academic term identifier
  semester: { 
    type: String, 
    default: 'Spring 2026' 
  },

  /**
   * Operational Status:
   * Active: Ongoing session
   * Critical: Subject to AI intervention due to low engagement
   * Completed: Term concluded
   */
  status: { 
    type: String, 
    enum: ['Active', 'Critical', 'Completed'], 
    default: 'Active' 
  },

  // Metadata for the upcoming scheduled session
  nextClass: { 
    type: String, 
    default: 'Not Scheduled' 
  },

  // Formatted string representing weekly availability slots
  classTiming: { 
    type: String, 
    default: 'Not Scheduled' 
  },
}, { 
  // Enables createdAt and updatedAt timestamps for administrative auditing
  timestamps: true 
});

// Prevention of Model Re-compilation Error (Singleton Pattern)
module.exports = mongoose.models.Course || mongoose.model('Course', courseSchema);