const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  roles: { type: Array, default: [] },
});

const User = mongoose.model('User', UserSchema);

const seedUsers = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/hierarchyflow', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    const users = [
      {
        name: 'Admin User',
        email: 'admin@example.com',
        passwordHash: await bcrypt.hash('admin123', 10),
        roles: ['admin'],
      },
      {
        name: 'Regular User',
        email: 'user1@example.com',
        passwordHash: await bcrypt.hash('password123', 10),
        roles: ['user'],
      },
    ];

    await User.insertMany(users);
    console.log('Users seeded successfully');

    mongoose.connection.close();
  } catch (error) {
    console.error('Error seeding users:', error);
    mongoose.connection.close();
  }
};

seedUsers();