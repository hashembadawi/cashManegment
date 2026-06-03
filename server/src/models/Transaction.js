const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    boxId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CashBox',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['receipt', 'payment'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0.01,
    },
    note: {
      type: String,
      trim: true,
      default: '',
      maxlength: 400,
    },
    transactionDate: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Transaction', transactionSchema);
