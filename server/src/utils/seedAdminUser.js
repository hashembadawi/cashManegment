const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function seedAdminUser() {
  const adminUsername = String(process.env.ADMIN_USERNAME || 'admin').trim().toLowerCase();
  const adminPassword = String(process.env.ADMIN_PASSWORD || 'admin1234').trim();

  const existingAdmin = await User.findOne({ username: adminUsername });
  if (existingAdmin) {
    return;
  }

  const passwordHash = await bcrypt.hash(adminPassword, 10);
  await User.create({
    username: adminUsername,
    passwordHash,
    role: 'admin',
  });

  console.log(`Seeded default admin user: ${adminUsername}`);
}

module.exports = seedAdminUser;
