const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

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

const MONGODB_URI = process.env.MONGODB_URI;

async function seedHarshUsers() {
  try {
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is missing');
      process.exit(1);
    }
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const users = [
      {
        email: 'harsh@niti.gov.in',
        password: 'jT2akJML35',
        name: 'Harsh (State Advisor)',
        roles: [{ role: 'State Advisor', state: 'Delhi' }]
      },
      {
        email: 'harsh2@niti.gov.in',
        password: 'j05cmgkF8W',
        name: 'Harsh (State YP)',
        roles: [{ role: 'State YP', state: 'Delhi' }]
      },
      {
        email: 'harsh3@niti.gov.in',
        password: 'kQgnaAsk5t',
        name: 'Harsh (Div HOD)',
        roles: [{ role: 'Division HOD', state: 'Delhi', branch: 'Education' }]
      },
      {
        email: 'harsh4@niti.gov.in',
        password: '0aBhmmaBmb',
        name: 'Harsh (Div YP)',
        roles: [{ role: 'Division YP', state: 'Delhi', branch: 'Education' }]
      }
    ];

    for (const u of users) {
      const existing = await User.findOne({ email: u.email });
      const passwordHash = await bcrypt.hash(u.password, 10);
      
      if (existing) {
        existing.passwordHash = passwordHash;
        existing.roles = u.roles;
        existing.name = u.name;
        await existing.save();
        console.log(`✅ Updated user: ${u.email}`);
      } else {
        await User.create({
          name: u.name,
          email: u.email,
          passwordHash,
          roles: u.roles,
          status: 'active',
          avatarUrl: `https://ui-avatars.com/api/?name=${u.name.replace(' ', '+')}`
        });
        console.log(`✅ Created user: ${u.email}`);
      }
    }

    await mongoose.connection.close();
    console.log('✅ Harsh users seeded successfully');
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

seedHarshUsers();
