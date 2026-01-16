import mongoose from 'mongoose';

type ConnectionObject = {
    isConnected?: number;
};

const connection: ConnectionObject = {};

async function dbConnect(): Promise<void> {
    // Check if we have a connection to the database or if it's currently connecting
    if (connection.isConnected) {
        console.log('Already connected to database');
        return;
    }

    try {
        // Attempt to connect to the database
        const db = await mongoose.connect(process.env.MONGODB_URI || '', {
            dbName: 'monterrey_crm',
        });

        connection.isConnected = db.connections[0].readyState;

        console.log('Database connected successfully');
    } catch (error) {
        console.error('Database connection failed:', error);
        // Exit process with failure
        process.exit(1);
    }
}

export default dbConnect;

export async function runTransaction<T>(
    operation: (session?: mongoose.ClientSession) => Promise<T>
): Promise<T> {
    const session = await mongoose.startSession();
    let transactionStarted = false;

    try {
        session.startTransaction();
        transactionStarted = true;

        const result = await operation(session);

        await session.commitTransaction();
        return result;
    } catch (error: any) {
        if (transactionStarted) {
            try {
                await session.abortTransaction();
            } catch (abortError) {
                // Ignore abort errors (e.g. if transaction never really started on server)
            }
        }

        // Check for replica set required error
        if (
            error.message?.includes('replica set') ||
            error.message?.includes('Transaction numbers') ||
            (error.code === 20 && error.codeName === 'IllegalOperation')
        ) {
            console.warn('Transactions not supported (Not Replica Set). Retrying without transaction.');
            // Retry the operation without a session
            return await operation(undefined);
        }

        throw error;
    } finally {
        await session.endSession();
    }
}
