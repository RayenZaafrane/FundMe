import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Fund from '../models/Fund.js';
import auth from '../middleware/auth.js';

const router = express.Router();

const generateToken = (id) => {
  const secret = process.env.JWT_SECRET || 'your_jwt_secret_key_change_this_in_production';
  return jwt.sign({ id }, secret, { expiresIn: '7d' });
};

// Register
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    if (password.length < 3) {
      return res.status(400).json({ message: 'Password must be at least 3 characters' });
    }

    // Check if user exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ message: 'Email already registered' });
    }

    // Create user
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase(),
      password,
    });

    await user.save();

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        funderUsername: user.funderUsername,
        continent: user.continent,
        firstLoginComplete: user.firstLoginComplete,
      },
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ message: error.message || 'Registration failed' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    console.log('Received login request:', req.body);
    
    const { email, password } = req.body;
    
    console.log('Email:', email);
    console.log('Password:', password ? '***' : 'MISSING');

    if (!email || !password) {
      console.log('Missing email or password!');
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    // Find user and select password field
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');
    
    if (!user) {
      console.log('User not found:', email);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    console.log('User found:', user.email);
    console.log('Has password field:', !!user.password);

    // Check password
    const isMatch = await user.matchPassword(password);
    console.log('Password match result:', isMatch);
    
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = generateToken(user._id);

    res.status(200).json({
      success: true,
      message: 'User logged in successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        funderUsername: user.funderUsername,
        continent: user.continent,
        firstLoginComplete: user.firstLoginComplete,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ message: error.message || 'Login failed' });
  }
});

// Get current user
router.get('/me', auth, async (req, res) => {
  res.json({ success: true, user: req.user });
});

// First-time setup: save funder username and continent
router.post('/setup-profile', auth, async (req, res) => {
  try {
    const { funderUsername, continent } = req.body;

    if (!funderUsername || !continent) {
      return res.status(400).json({ message: 'Please provide funder username and continent' });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    user.funderUsername = funderUsername.trim();
    user.continent = continent.trim();
    user.firstLoginComplete = true;
    await user.save();

    res.json({
      success: true,
      message: 'Profile saved',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        funderUsername: user.funderUsername,
        continent: user.continent,
        firstLoginComplete: user.firstLoginComplete,
      },
    });
  } catch (error) {
    console.error('Setup profile error:', error);
    res.status(500).json({ message: error.message || 'Failed to save profile' });
  }
});

// Submit fund
router.post('/submit-fund', auth, async (req, res) => {
  try {
    const { destination, funderName, amount, currency } = req.body;

    if (!destination || !funderName || !amount || !currency) {
      return res.status(400).json({ message: 'Please provide all fields' });
    }

    if (amount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than zero' });
    }

    // Create fund object
    const fundData = {
      destination: destination.trim(),
      funderName: funderName.trim(),
      amount: parseFloat(amount),
      currency: currency.toUpperCase(),
      createdAt: new Date(),
    };

    // Add to user's funds array
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $push: { funds: fundData } },
      { new: true }
    );

    // Also save to Funds collection for global tracking
    const fund = new Fund({
      destination: fundData.destination,
      funderName: fundData.funderName,
      funderId: req.user.id,
      amount: fundData.amount,
      currency: fundData.currency,
    });

    await fund.save();

    res.status(201).json({
      success: true,
      message: 'Fund submitted successfully',
      fund: fundData,
    });
  } catch (error) {
    console.error('Submit fund error:', error);
    res.status(500).json({ message: error.message || 'Failed to submit fund' });
  }
});

// Get user's funds
router.get('/my-funds', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      funds: user.funds || [],
    });
  } catch (error) {
    console.error('Get funds error:', error);
    res.status(500).json({ message: error.message || 'Failed to retrieve funds' });
  }
});

// Remove (withdraw) fund: records a negative transaction
router.post('/remove-fund', auth, async (req, res) => {
  try {
    const { destination, funderName, amount, currency } = req.body;

    if (!destination || !amount || !currency) {
      return res.status(400).json({ message: 'Please provide destination, amount, and currency' });
    }

    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number' });
    }

    const tx = {
      destination: String(destination).trim(),
      funderName: (funderName ? String(funderName) : req.user.name || 'Withdrawal').trim(),
      amount: -Math.abs(amt),
      currency: String(currency).toUpperCase(),
      createdAt: new Date(),
    };

    // Append to user's embedded funds
    await User.findByIdAndUpdate(
      req.user.id,
      { $push: { funds: tx } },
      { new: true }
    );

    // Also persist in global Funds collection
    const fund = new Fund({
      destination: tx.destination,
      funderName: tx.funderName,
      funderId: req.user.id,
      amount: tx.amount,
      currency: tx.currency,
    });
    await fund.save();

    res.status(201).json({
      success: true,
      message: 'Removal recorded successfully',
      fund: tx,
    });
  } catch (error) {
    console.error('Remove fund error:', error);
    res.status(500).json({ message: error.message || 'Failed to remove fund' });
  }
});

// Remove all funds for a country for the current user
router.post('/remove-country', auth, async (req, res) => {
  try {
    const { destination } = req.body;

    if (!destination) {
      return res.status(400).json({ message: 'Please provide destination' });
    }

    const dest = String(destination).trim();

    // Remove embedded funds for this destination from the user document
    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $pull: { funds: { destination: dest } } },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Remove all corresponding Fund documents for this user and destination
    await Fund.deleteMany({ funderId: req.user.id, destination: dest });

    res.status(200).json({
      success: true,
      message: 'All funds for destination removed',
      destination: dest,
    });
  } catch (error) {
    console.error('Remove country funds error:', error);
    res.status(500).json({ message: error.message || 'Failed to remove country funds' });
  }
});

// Delete account and all associated data
router.delete('/delete-account', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    // Delete all funds associated with this user from the Fund collection
    await Fund.deleteMany({ funderId: userId });

    // Delete the user document (which also contains user.funds array)
    const deletedUser = await User.findByIdAndDelete(userId);

    if (!deletedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      success: true,
      message: 'Account and all associated data deleted successfully',
    });
  } catch (error) {
    console.error('Delete account error:', error);
    res.status(500).json({ message: error.message || 'Failed to delete account' });
  }
});

export default router;
