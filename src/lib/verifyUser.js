const mongoose = require('mongoose');

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

async function verifyUser() {
  try {
    if (!MONGODB_URI) {
      console.error('❌ MONGODB_URI is missing');
      process.exit(1);
    }
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const email = 'superadmin@gov.in';
    const user = await User.findOne({ email });

    if (user) {
      console.log('✅ User found:', user.email);
      console.log('   Name:', user.name);
      console.log('   Roles:', JSON.stringify(user.roles));
      console.log('   Status:', user.status);
      console.log('   Password Hash (first 10 chars):', user.passwordHash.substring(0, 10));
    } else {
      console.error('❌ User NOT found:', email);
    }

    await mongoose.connection.close();
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verifyUser();
