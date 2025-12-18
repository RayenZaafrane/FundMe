import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;
const MONGODB_URI = (process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb+srv://rayenzaafrane1_db_user:mjfIGiFWJm86V9L7@cluster0.opgyrkm.mongodb.net/?appName=Cluster0/Clients');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging (skip noisy endpoints and GET/HEAD bodies)
app.use((req, res, next) => {
  // Skip logging for frequent polling endpoint to reduce console spam
  if (req.url.startsWith('/api/auth/my-funds')) {
    return next();
  }

  console.log(`${req.method} ${req.url}`);
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    console.log('Body:', req.body);
  }
  next();
});

// Connect to MongoDB
async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      retryWrites: true,
    });
    console.log('Connected to MongoDB (Clients database)');

    // Root route
    app.get('/', (req, res) => {
      res.json({ message: 'FundMe API is running', version: '1.0.0' });
    });

    // Routes
    app.use('/api/auth', authRoutes);

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

startServer();
