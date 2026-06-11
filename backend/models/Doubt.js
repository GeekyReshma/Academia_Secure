const mongoose = require('mongoose');

const doubtSchema = new mongoose.Schema({
    studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    courseCode: { type: String, required: true },
    question: { type: String, required: true },
    answer: { type: String, default: "" }, 
    status: { type: String, enum: ['Pending', 'Resolved'], default: 'Pending' },
    isReadByStudent: { type: Boolean, default: false },
    isReadByTeacher: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Doubt', doubtSchema);