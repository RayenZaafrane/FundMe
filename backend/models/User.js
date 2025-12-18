import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: true,
      select: false,
    },
    funderUsername: {
      type: String,
      trim: true,
    },
    continent: {
      type: String,
      trim: true,
    },
    firstLoginComplete: {
      type: Boolean,
      default: false,
    },
    funds: [
      {
        destination: {
          type: String,
          required: true,
          trim: true,
        },
        funderName: {
          type: String,
          required: true,
          trim: true,
        },
        amount: {
          type: Number,
          required: true,
        },
        currency: {
          type: String,
          required: true,
          default: 'USD',
        },
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { collection: 'Client_acc' }
);

// Hash password before saving
userSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  
  try {
    // Check if password is already hashed (bcrypt hashes start with $2)
    if (this.password.startsWith('$2')) {
      return;
    }
    
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (err) {
    throw err;
  }
});

// Method to compare passwords
userSchema.methods.matchPassword = async function (enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

export default mongoose.model('User', userSchema);
