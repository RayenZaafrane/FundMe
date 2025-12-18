import mongoose from 'mongoose';

const fundSchema = new mongoose.Schema(
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
    funderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
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
  { collection: 'Funds' }
);

const Fund = mongoose.model('Fund', fundSchema);

export default Fund;
