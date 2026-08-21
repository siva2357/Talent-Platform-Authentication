const mongoose = require('mongoose');
const User = require('./models/user');
const Transaction = require('./models/transaction');
require('dotenv').config();

async function reconcileBalances() {
  try {
    const mongoUri = process.env.MONGO_LOCAL_URI || 'mongodb://127.0.0.1:27017/Talent-Hub';
    await mongoose.connect(mongoUri, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log("Connected to MongoDB:", mongoUri);

    const freelancers = await User.find({ role: { $regex: /^freelancer$/i } });
    console.log(`Found ${freelancers.length} freelancers.`);

    for (const freelancer of freelancers) {
      // Find all payments released to this user
      const releasedTxns = await Transaction.find({ userId: freelancer._id, type: 'Payment Released' });
      const totalEarned = releasedTxns.reduce((sum, txn) => sum + txn.amount, 0);

      // Find all withdrawals by this user
      const withdrawnTxns = await Transaction.find({ userId: freelancer._id, type: 'Withdrawal' });
      const totalWithdrawn = withdrawnTxns.reduce((sum, txn) => sum + txn.amount, 0);

      // Find all completed payouts
      const payoutTxns = await Transaction.find({ userId: freelancer._id, type: 'Payout', status: 'Processed' });
      const totalPayouts = payoutTxns.reduce((sum, txn) => sum + txn.amount, 0);

      const realBalance = Math.max(0, totalEarned - totalWithdrawn - totalPayouts);
      
      console.log(`User: ${freelancer.registrationDetails?.email}`);
      console.log(`Earned: ${totalEarned}, Withdrawn: ${totalWithdrawn}, Payouts: ${totalPayouts}`);
      console.log(`Old Balance: ${freelancer.balance || 0} -> New Balance: ${realBalance}`);

      freelancer.balance = realBalance;
      await freelancer.save();
    }

    console.log("Reconciliation complete!");
  } catch (err) {
    console.error("Error:", err);
  } finally {
    mongoose.connection.close();
  }
}

reconcileBalances();
