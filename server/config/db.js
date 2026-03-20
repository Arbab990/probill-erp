import mongoose from 'mongoose';

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

        // Drop old global unique indexes replaced with per-company logic — silent if already gone
        const legacyIndexes = [
            { collection: 'vendors', index: 'vendorCode_1' },
            { collection: 'purchaserequisitions', index: 'prNumber_1' },
            { collection: 'purchaseorders', index: 'poNumber_1' },
            { collection: 'goodsreceipts', index: 'grnNumber_1' },
            { collection: 'salesorders', index: 'soNumber_1' },
            { collection: 'paymentruns', index: 'runNumber_1' },
            { collection: 'journalentries', index: 'entryNo_1' },
            { collection: 'invoices', index: 'invoiceNo_1' },
            { collection: 'customers', index: 'customerCode_1' },
        ];
        for (const { collection, index } of legacyIndexes) {
            try {
                await conn.connection.collection(collection).dropIndex(index);
                console.log(`🧹 Dropped legacy ${index} index from ${collection}`);
            } catch (_) { /* already gone */ }
        }

    } catch (error) {
        console.error(`❌ MongoDB Error: ${error.message}`);
        process.exit(1);
    }
};

export default connectDB;
