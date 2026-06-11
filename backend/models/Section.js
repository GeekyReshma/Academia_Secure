const mongoose = require('mongoose');

const sectionSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true }
});

module.exports = mongoose.models.Section || mongoose.model('Section', sectionSchema);