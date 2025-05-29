const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const jwt = require('jsonwebtoken');
const { format, addDays } = require('date-fns');

dotenv.config();
const app = express();

// Configure CORS
app.use(cors({
  origin: ['http://localhost:3000', 'https://app.rossbased.com'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));

// Handle CORS preflight requests
app.options('*', cors());

app.use(express.json());

// Error-handling middleware
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// MongoDB connection
const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/rossbased';
mongoose.connect(mongoUri)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB connection error:', err));

// User schema
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  password: String, // In production, hash passwords
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

// Debug middleware to log all requests
app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`, req.body);
  next();
});

// Middleware to verify JWT
const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    console.log('No authorization header provided');
    return res.status(401).json({ error: 'Unauthorized - No token provided' });
  }
  
  // Check if the authorization header is properly formatted
  const tokenParts = authHeader.split(' ');
  if (tokenParts.length !== 2 || tokenParts[0] !== 'Bearer') {
    console.log('Authorization header malformed:', authHeader);
    return res.status(401).json({ error: 'Unauthorized - Invalid token format' });
  }
  
  const token = tokenParts[1];
  
  try {
    // Use a consistent JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET || 'rossbased_secret_key';
    console.log('Verifying token with secret:', jwtSecret.substring(0, 3) + '...');
    
    const decoded = jwt.verify(token, jwtSecret);
    console.log('Token verified successfully for user:', decoded.username);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('JWT verification error:', err);
    // Return a more descriptive error message
    return res.status(401).json({ 
      error: 'Unauthorized - Token invalid',
      details: err.message 
    });
  }
};

// Login endpoint
app.post('/api/login', async (req, res) => {
  console.log('Received login request:', req.body);
  const { username, password } = req.body;
  try {
    let user = await User.findOne({ username });
    if (!user) {
      console.log('Creating new user:', username);
      user = new User({
        username,
        password, // In production, hash this
        startDate: new Date(),
        currentStreak: 0,
        longestStreak: 0,
        wetDreamCount: 0,
        relapseCount: 0,
        isPremium: false,
        badges: [
          { id: 1, name: '7-Day Warrior', earned: false, date: null },
          { id: 2, name: '14-Day Monk', earned: false, date: null },
          { id: 3, name: '30-Day Master', earned: false, date: null },
          { id: 4, name: '90-Day King', earned: false, date: null }
        ],
        benefitTracking: [
          { date: new Date(), energy: 8, focus: 7, confidence: 6 },
          { date: addDays(new Date(), -2), energy: 6, focus: 5, confidence: 7 }
        ],
        streakHistory: [{
          id: 1,
          start: new Date(),
          end: null,
          days: 0,
          reason: null
        }],
        urgeToolUsage: [],
        discordUsername: '',
        showOnLeaderboard: false,
        notes: {}
      });
      await user.save();
      console.log('User created:', username);
    } else if (user.password !== password) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    // Use a consistent JWT_SECRET
    const jwtSecret = process.env.JWT_SECRET || 'rossbased_secret_key';
    console.log('Generating token with secret:', jwtSecret.substring(0, 3) + '...');
    
    const token = jwt.sign({ username }, jwtSecret, { expiresIn: '7d' }); // Extended expiration to 7 days
    console.log('Login successful, token generated for:', username);
    
    res.json({ token, ...user.toObject() });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

// Get user data
app.get('/api/user/:username', authenticate, async (req, res) => {
  console.log('Received get user request for:', req.params.username);
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) {
      console.log('User not found:', req.params.username);
      return res.status(404).json({ error: 'User not found' });
    }
    console.log('Returning user data for:', req.params.username);
    res.json(user);
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user data - Using PUT method
app.put('/api/user/:username', authenticate, async (req, res) => {
  console.log('Received update user request for:', req.params.username);
  console.log('Update data:', req.body);
  
  try {
    // Check if user exists first
    const existingUser = await User.findOne({ username: req.params.username });
    if (!existingUser) {
      console.log('User not found:', req.params.username);
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Process dates if needed
    const updateData = { ...req.body };
    
    // Update the user
    const user = await User.findOneAndUpdate(
      { username: req.params.username },
      { $set: updateData },
      { new: true }
    );
    
    console.log('User updated successfully:', req.params.username);
    res.json(user);
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Just for testing: Get all users
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({});
    res.json(users);
  } catch (err) {
    console.error('Get users error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Serve frontend build in production
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  app.use(express.static(path.join(__dirname, '../build')));
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../build', 'index.html'));
  });
}

const PORT = process.env.PORT || 5001;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));