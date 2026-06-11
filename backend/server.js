const express = require('express'); 
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const cors = require('cors'); 
const bcrypt = require('bcryptjs'); 
const Department = require('./models/Department');
const User = require('./models/User');
const teacherRoutes = require('./routes/teacherRoutes');

// Environment Configuration: Loading system variables
dotenv.config();

const app = express();

/**
 * Global Middlewares:
 * CORS: Enables Cross-Origin Resource Sharing for the React frontend.
 * JSON Parser: Parses incoming request bodies as JSON telemetry.
 */
app.use(cors()); 
app.use(express.json()); 

/**
 * Data Seeding: seedDepartments
 * Purpose: Initializes the database with a baseline set of academic departments 
 * if the collection is currently empty.
 */
const seedDepartments = async () => {
    try {
        const count = await Department.countDocuments();
        if (count === 0) {
            const defaultDepts = [
                { name: "Computer Science" },
                { name: "Artificial Intelligence" },
                { name: "Information Technology" },
                { name: "Data Science" },
                { name: "Electronics & Communication" }
            ];
            await Department.insertMany(defaultDepts);
            console.log("Initialization: Default Departments Seeded.");
        }
    } catch (err) {
        console.error("Critical: Department seeding protocol failed.", err);
    }
};

/**
 * Security Provisioning: createGodAdmin
 * Purpose: Ensures at least one super-administrative identity exists 
 * to manage institutional configurations.
 */
const createGodAdmin = async () => {
    try {
        const adminEmail = "sanusinha814@gmail.com"; 
        const adminExists = await User.findOne({ email: adminEmail });
        
        if (!adminExists) {
            // Salted password hashing using bcrypt
            const hashedPassword = await bcrypt.hash("admin123", 10);
            await User.create({
                name: "Anirudh Kumar",
                email: adminEmail,
                password: hashedPassword,
                role: "admin",
                id: "ADMIN-001"
            });
            console.log(`Security: GOD ADMIN node provisioned: ${adminEmail}`);
        } else {
            console.log("Security Check: Master Admin already registered.");
        }
    } catch (err) {
        console.error("Critical: Admin provisioning failed:", err.message);
    }
};

/**
 * Database Handshake:
 * Connecting to MongoDB Cluster and triggering post-connection protocols.
 */
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
      console.log("Connection: MongoDB Clusters linked to AcademiaAI.");
      seedDepartments(); 
      createGodAdmin(); 
  })
  .catch((err) => console.error("Database Error: Connection handshaking failed.", err));

/**
 * Route Orchestration:
 * Mapping RESTful endpoints to their respective logical controllers.
 */
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/attendance', require('./routes/attendanceRoutes'));
app.use('/api/auth', require('./routes/authRoutes'));
app.use('/api/insights', require('./routes/insightRoutes'));
app.use('/api/courses', require('./routes/courseRoutes'));
// app.use('/api/seed', require('./routes/seedRoutes'));
app.use('/api/admin', require('./routes/adminRoutes'));
app.use('/api/student', require('./routes/studentRoutes'));
app.use('/api/teacher', teacherRoutes);

// Server Execution: Binding to port for institutional operations
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server Status: Live on Port ${PORT}`);
});