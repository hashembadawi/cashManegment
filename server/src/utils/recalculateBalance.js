const mongoose = require('mongoose');
const CashBox = require('../models/CashBox');
const Transaction = require('../models/Transaction');

async function recalculateBoxBalance(boxId) {
  const normalizedId = new mongoose.Types.ObjectId(boxId);

  const [box, sums] = await Promise.all([
    CashBox.findById(normalizedId),
    Transaction.aggregate([
      { $match: { boxId: normalizedId } },
      {
        $group: {
          _id: '$boxId',
          receipts: {
            $sum: {
              $cond: [{ $eq: ['$type', 'receipt'] }, '$amount', 0],
            },
          },
          payments: {
            $sum: {
              $cond: [{ $eq: ['$type', 'payment'] }, '$amount', 0],
            },
          },
        },
      },
    ]),
  ]);

  if (!box) {
    return null;
  }

  const totals = sums[0] || { receipts: 0, payments: 0 };
  const nextBalance = Number(
    (box.openingBalance + totals.receipts - totals.payments).toFixed(2)
  );

  box.currentBalance = nextBalance;
  await box.save();

  return box;
}

module.exports = recalculateBoxBalance;
