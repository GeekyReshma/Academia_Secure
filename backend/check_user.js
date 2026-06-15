require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./models/User');
(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('dbName', mongoose.connection.name);
    const user = await User.findOne({ email: 'sharma02reshma@gmail.com' }).lean();
    console.log('userExists', !!user);
    if (user) {
      console.log('user', {
        email: user.email,
        role: user.role,
        id: user.id,
        name: user.name,
        passwordSet: !!user.password,
        otpSet: !!user.otp,
        createdAt: user.createdAt,
      });
    }
    await mongoose.disconnect();
  } catch (err) {
    console.error('dbError', err.message);
    process.exit(1);
  }
})();
