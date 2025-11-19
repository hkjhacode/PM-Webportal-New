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
  avatarUrl: { type: String },
  status: { type: String, enum: ['pending', 'active'], default: 'active' },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/visitwise';

async function seedPMOUser() {
  try {
    await mongoose.connect(MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Create PMO Viewer user
    const pmoEmail = 'pmo@gov.in';
    const pmoPassword = 'PMO@123';
    
    const existingPMO = await User.findOne({ email: pmoEmail });
    if (existingPMO) {
      // Update existing user
      existingPMO.passwordHash = await bcrypt.hash(pmoPassword, 10);
      existingPMO.roles = [{ role: 'PMO Viewer' }];
      existingPMO.status = 'active';
      await existingPMO.save();
      console.log('✅ Updated PMO user:', pmoEmail);
    } else {
      // Create new user
      await User.create({
        name: 'Anika Singh',
        email: pmoEmail,
        passwordHash: await bcrypt.hash(pmoPassword, 10),
        roles: [{ role: 'PMO Viewer' }],
        status: 'active',
        avatarUrl: 'https://picsum.photos/seed/6/100/100',
      });
      console.log('✅ Created PMO user:', pmoEmail, 'Password:', pmoPassword);
    }

    // Also create other demo users if needed
    const demoUsers = [
      {
        email: 'ceo.niti@gov.in',
        password: 'Ceo@123',
        name: 'Aarav Sharma',
        roles: [{ role: 'CEO NITI' }],
      },
      {
        email: 'advisor.up@gov.in',
        password: 'Advisor@123',
        name: 'Priya Patel',
        roles: [
          { role: 'State Advisor', state: 'Uttar Pradesh' },
          { role: 'State Advisor', state: 'Gujarat' }
        ],
      },
    ];

    for (const demoUser of demoUsers) {
      const existing = await User.findOne({ email: demoUser.email });
      if (existing) {
        existing.passwordHash = await bcrypt.hash(demoUser.password, 10);
        existing.roles = demoUser.roles;
        existing.status = 'active';
        await existing.save();
        console.log('✅ Updated user:', demoUser.email);
      } else {
        await User.create({
          name: demoUser.name,
          email: demoUser.email,
          passwordHash: await bcrypt.hash(demoUser.password, 10),
          roles: demoUser.roles,
          status: 'active',
        });
        console.log('✅ Created user:', demoUser.email);
      }
    }

    await mongoose.connection.close();
    console.log('✅ Users seeded successfully');
    console.log('\n📝 Login credentials:');
    console.log('   PMO Viewer: pmo@gov.in / PMO@123');
    console.log('   CEO NITI: ceo.niti@gov.in / Ceo@123');
    console.log('   State Advisor: advisor.up@gov.in / Advisor@123');
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    try { await mongoose.connection.close(); } catch {}
    process.exit(1);
  }
}

seedPMOUser();

