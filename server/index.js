const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// MongoDB connection
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/rossbased';
mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// User Schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: String,
  startDate: Date,
  currentStreak: Number,
  longestStreak: Number,
  wetDreamCount: Number,
  relapseCount: Number,
  isPremium: Boolean,
  badges: [{ id: Number, name: String, earned: Boolean, date: Date }],
  benefitTracking: [{ date: Date, energy: Number, focus: Number, confidence: Number }],
  streakHistory: [{ id: Number, start: Date, end: Date, days: Number, reason: String }],
  urgeToolUsage: [{ date: Date, tool: String, effective: Boolean }],
  discordUsername: String,
  showOnLeaderboard: Boolean,
  notes: Object
});

const User = mongoose.model('User', userSchema);

// Login Route
app.post('/api/login', async (req, res) => {
  console.log('Received login request:', req.body);
  const { username, password } = req.body;
  try {
    let user = await User.findOne({ username });
    if (!user) {
      console.log(`Creating new user: ${username}`);
      user = new User({
        username,
        password, // In production, hash passwords
        startDate: new Date(),
        currentStreak: 0,
        longestStreak: 0,
        wetDreamCount: 0,
        relapseCount: 0,
        isPremium: false,
        badges: [],
        benefitTracking: [],
        streakHistory: [],
        urgeToolUsage: [],
        discordUsername: '',
        showOnLeaderboard: false,
        notes: {}
      });
      await user.save();
      console.log(`User created: ${username}`);
    } else if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    res.json(user);
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get User Data
app.get('/api/user/:username', async (req, res) => {
  console.log(`Received get user request for: ${req.params.username}`);
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      console.log(`User not found: ${req.params.username}`);
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update User Data
app.put('/api/user/:username', async (req, res) => {
  console.log(`Received update user request for: ${req.params.username}`, req.body);
  try {
    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: req.body },
      { new: true }
    );
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));