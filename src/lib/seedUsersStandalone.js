const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

// Match the app's User schema role shape
const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  roles: { type: [{ role: String, state: String, branch: String }], default: [] },
  state: { type: String },
  branch: { type: String },
});

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hierarchyflow';

async function seedUsers() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    const adminEmail = 'admin@example.com';
    const userEmail = 'user1@example.com';

    const adminExisting = await User.findOne({ email: adminEmail });
    if (!adminExisting) {
      await User.create({
        name: 'Admin User',
        email: adminEmail,
        passwordHash: await bcrypt.hash('admin123', 10),
        roles: [{ role: 'Super Admin', state: 'Andaman & Nicobar', branch: 'Energy' }],
        state: 'Andaman & Nicobar',
        branch: 'Energy',
      });
      console.log('Seeded admin@example.com (Super Admin)');
    } else {
      // Ensure admin has a proper Super Admin role object
      adminExisting.roles = [{ role: 'Super Admin', state: 'Andaman & Nicobar', branch: 'Energy' }];
      adminExisting.state = adminExisting.state || 'Andaman & Nicobar';
      adminExisting.branch = adminExisting.branch || 'Energy';
      await adminExisting.save();
      console.log('Admin user ensured with Super Admin role');
    }

    const userExisting = await User.findOne({ email: userEmail });
    if (!userExisting) {
      await User.create({
        name: 'Regular User',
        email: userEmail,
        passwordHash: await bcrypt.hash('password123', 10),
        roles: [{ role: 'Div YP', state: 'Andaman & Nicobar', branch: 'Energy' }],
        state: 'Andaman & Nicobar',
        branch: 'Energy',
      });
      console.log('Seeded user1@example.com (Div YP)');
    } else {
      // Ensure demo user has a valid role object
      userExisting.roles = [{ role: 'Div YP', state: 'Andaman & Nicobar', branch: 'Energy' }];
      userExisting.state = userExisting.state || 'Andaman & Nicobar';
      userExisting.branch = userExisting.branch || 'Energy';
      await userExisting.save();
      console.log('Regular user ensured with Div YP role');
    }

    await mongoose.connection.close();
    console.log('Users seeded successfully');
  } catch (error) {
    console.error('Error seeding users:', error);
    try { await mongoose.connection.close(); } catch {}
    process.exit(1);
  }
}

seedUsers();
