import mongoose from 'mongoose';
/**
 * DB Connection Helper
 * Aligns with SRS Section 2.5 (Design Constraints: MongoDB Atlas + GridFS).
 * Uses a cached connection to avoid reconnection in Next.js App Router.
 */
const MONGODB_URI = process.env.MONGODB_URI || '';
if (!MONGODB_URI) {
    console.warn('MONGODB_URI is not set. The app will operate in mock/in-memory mode.');
}
let cached = global.mongooseCache || { conn: null, promise: null };
export async function connectDB() {
    if (cached.conn)
        return cached.conn;
    if (!cached.promise) {
        if (!MONGODB_URI) {
            // Return a dummy connection object to avoid crashes in dev without DB.
            cached.conn = mongoose;
            return cached.conn;
        }
        cached.promise = mongoose
            .connect(MONGODB_URI, {
            autoIndex: true,
            dbName: process.env.MONGODB_DB || undefined,
        })
            .then((mongooseInstance) => mongooseInstance);
    }
    cached.conn = await cached.promise;
    global.mongooseCache = cached;
    return cached.conn;
}
export function getDB() {
    return mongoose.connection;
}
/** Traceability: FR-01 to FR-03 depend on DB-backed users and token blacklist storage. */ 
