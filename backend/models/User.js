const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true }, 
    department: { type: String },
    batch: { type: String },
    section: { type: String }, 
    role: { type: String, enum: ["admin", "faculty", "student"], default: "student" },
    initials: { type: String },
    id: { type: String, unique: true }, 
    otp: { type: String, default: null },
    otpExpires: { type: Date, default: null }
  },
  { timestamps: true }
);

module.exports = mongoose.models.User || mongoose.model("User", userSchema);