const express = require('express');
const mongoose = require('mongoose');
const CashBox = require('../models/CashBox');
const Transaction = require('../models/Transaction');
const recalculateBoxBalance = require('../utils/recalculateBalance');

const router = express.Router();
const SUPPORTED_CURRENCIES = ['USD', 'TRY', 'SYP'];

function normalizeCurrency(currency) {
  return String(currency || 'USD').trim().toUpperCase();
}

router.get('/boxes', async (req, res) => {
  try {
    const { search = '' } = req.query;
    const ownerUserId = req.user.sub;
    const filter = search
      ? {
          ownerUserId,
          name: { $regex: String(search), $options: 'i' },
        }
      : { ownerUserId };

    const boxes = await CashBox.find(filter).sort({ createdAt: -1 }).lean();
    res.json(boxes);
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch cash boxes.' });
  }
});

router.post('/boxes', async (req, res) => {
  try {
    const { name, description = '', openingBalance = 0, currency = 'USD' } = req.body;
    const ownerUserId = req.user.sub;

    if (!name || !String(name).trim()) {
      return res.status(400).json({ message: 'Name is required.' });
    }

    const opening = Number(openingBalance);
    if (Number.isNaN(opening) || opening < 0) {
      return res.status(400).json({ message: 'Opening balance must be >= 0.' });
    }

    const normalizedCurrency = normalizeCurrency(currency);
    if (!SUPPORTED_CURRENCIES.includes(normalizedCurrency)) {
      return res.status(400).json({
        message: 'Currency must be one of: USD, TRY, SYP.',
      });
    }

    const box = await CashBox.create({
      ownerUserId,
      name: String(name).trim(),
      description: String(description).trim(),
      currency: normalizedCurrency,
      openingBalance: opening,
      currentBalance: opening,
    });

    res.status(201).json(box);
  } catch (error) {
    res.status(500).json({ message: 'Failed to create cash box.' });
  }
});

router.put('/boxes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, openingBalance, currency } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid box id.' });
    }

    const box = await CashBox.findOne({ _id: id, ownerUserId: req.user.sub });
    if (!box) {
      return res.status(404).json({ message: 'Cash box not found.' });
    }

    if (typeof name !== 'undefined') {
      if (!String(name).trim()) {
        return res.status(400).json({ message: 'Name cannot be empty.' });
      }
      box.name = String(name).trim();
    }

    if (typeof description !== 'undefined') {
      box.description = String(description).trim();
    }

    if (typeof currency !== 'undefined') {
      const normalizedCurrency = normalizeCurrency(currency);
      if (!SUPPORTED_CURRENCIES.includes(normalizedCurrency)) {
        return res.status(400).json({
          message: 'Currency must be one of: USD, TRY, SYP.',
        });
      }
      box.currency = normalizedCurrency;
    }

    if (typeof openingBalance !== 'undefined') {
      const opening = Number(openingBalance);
      if (Number.isNaN(opening) || opening < 0) {
        return res.status(400).json({ message: 'Opening balance must be >= 0.' });
      }
      box.openingBalance = opening;
    }

    await box.save();
    const updated = await recalculateBoxBalance(id);
    res.json(updated);
  } catch (error) {
    res.status(500).json({ message: 'Failed to update cash box.' });
  }
});

router.delete('/boxes/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid box id.' });
    }

    const box = await CashBox.findOne({ _id: id, ownerUserId: req.user.sub });
    if (!box) {
      return res.status(404).json({ message: 'Cash box not found.' });
    }

    await Transaction.deleteMany({ boxId: id });
    await CashBox.deleteOne({ _id: id, ownerUserId: req.user.sub });

    res.json({ message: 'Cash box deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete cash box.' });
  }
});

router.get('/boxes/:boxId/transactions', async (req, res) => {
  try {
    const { boxId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(boxId)) {
      return res.status(400).json({ message: 'Invalid box id.' });
    }

    const box = await CashBox.findOne({ _id: boxId, ownerUserId: req.user.sub }).lean();

    if (!box) {
      return res.status(404).json({ message: 'Cash box not found.' });
    }

    const transactions = await Transaction.find({ boxId })
      .sort({ transactionDate: -1, createdAt: -1 })
      .lean();

    res.json({ box, transactions });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch transactions.' });
  }
});

router.post('/boxes/:boxId/transactions', async (req, res) => {
  try {
    const { boxId } = req.params;
    const { type, amount, note = '', transactionDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(boxId)) {
      return res.status(400).json({ message: 'Invalid box id.' });
    }

    const box = await CashBox.findOne({ _id: boxId, ownerUserId: req.user.sub });
    if (!box) {
      return res.status(404).json({ message: 'Cash box not found.' });
    }

    const parsedAmount = Number(amount);
    if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
      return res.status(400).json({ message: 'Amount must be greater than 0.' });
    }

    if (!['receipt', 'payment'].includes(type)) {
      return res.status(400).json({ message: 'Type must be receipt or payment.' });
    }

    await Transaction.create({
      boxId,
      type,
      amount: parsedAmount,
      note: String(note).trim(),
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
    });

    const updatedBox = await recalculateBoxBalance(boxId);
    const transactions = await Transaction.find({ boxId })
      .sort({ transactionDate: -1, createdAt: -1 })
      .lean();

    res.status(201).json({ box: updatedBox, transactions });
  } catch (error) {
    res.status(500).json({ message: 'Failed to create transaction.' });
  }
});

router.put('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, note, transactionDate } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction id.' });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    const box = await CashBox.findOne({ _id: transaction.boxId, ownerUserId: req.user.sub });
    if (!box) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    if (typeof type !== 'undefined') {
      if (!['receipt', 'payment'].includes(type)) {
        return res.status(400).json({ message: 'Type must be receipt or payment.' });
      }
      transaction.type = type;
    }

    if (typeof amount !== 'undefined') {
      const parsedAmount = Number(amount);
      if (Number.isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ message: 'Amount must be greater than 0.' });
      }
      transaction.amount = parsedAmount;
    }

    if (typeof note !== 'undefined') {
      transaction.note = String(note).trim();
    }

    if (typeof transactionDate !== 'undefined') {
      const parsedDate = new Date(transactionDate);
      if (Number.isNaN(parsedDate.getTime())) {
        return res.status(400).json({ message: 'Invalid transaction date.' });
      }
      transaction.transactionDate = parsedDate;
    }

    await transaction.save();

    const updatedBox = await recalculateBoxBalance(transaction.boxId);
    const transactions = await Transaction.find({ boxId: transaction.boxId })
      .sort({ transactionDate: -1, createdAt: -1 })
      .lean();

    res.json({ box: updatedBox, transactions });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update transaction.' });
  }
});

router.delete('/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid transaction id.' });
    }

    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    const box = await CashBox.findOne({ _id: transaction.boxId, ownerUserId: req.user.sub });
    if (!box) {
      return res.status(404).json({ message: 'Transaction not found.' });
    }

    await Transaction.findByIdAndDelete(id);
    const updatedBox = await recalculateBoxBalance(transaction.boxId);
    const transactions = await Transaction.find({ boxId: transaction.boxId })
      .sort({ transactionDate: -1, createdAt: -1 })
      .lean();

    res.json({ box: updatedBox, transactions });
  } catch (error) {
    res.status(500).json({ message: 'Failed to delete transaction.' });
  }
});

module.exports = router;
