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

type Cached = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: Cached | undefined;
}

let cached: Cached = global.mongooseCache || { conn: null, promise: null };

export async function connectDB(): Promise<typeof mongoose> {
  // If already connected, return immediately
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }
  
  // If connection is in progress, wait for it
  if (cached.promise && mongoose.connection.readyState === 2) {
    return await cached.promise;
  }
  
  if (!cached.promise) {
    if (!MONGODB_URI) {
      console.warn('⚠️ MONGODB_URI is not set. Operating in mock mode.');
      // Return a dummy connection object to avoid crashes in dev without DB.
      cached.conn = mongoose;
      return cached.conn;
    }
    console.log('🔌 Connecting to MongoDB...');
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        autoIndex: true,
        dbName: process.env.MONGODB_DB || undefined,
        serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
      })
      .then((mongooseInstance) => {
        console.log('✅ MongoDB connected successfully');
        console.log(`   Database: ${mongooseInstance.connection.db?.databaseName || 'N/A'}`);
        console.log(`   Host: ${mongooseInstance.connection.host || 'N/A'}`);
        cached.conn = mongooseInstance;
        
        // Set up connection event handlers to keep connection alive
        mongooseInstance.connection.on('connected', () => {
          console.log('📡 MongoDB connection active');
        });
        
        mongooseInstance.connection.on('error', (err) => {
          console.error('❌ MongoDB connection error:', err.message);
        });
        
        mongooseInstance.connection.on('disconnected', () => {
          console.warn('⚠️ MongoDB disconnected');
          cached.conn = null;
          cached.promise = null;
        });
        
        return mongooseInstance;
      })
      .catch((error) => {
        console.error('❌ MongoDB connection failed:', error.message);
        cached.promise = null; // Reset promise on error
        cached.conn = null;
        throw error;
      });
  }
  
  try {
    const result = await cached.promise;
    global.mongooseCache = cached;
    return result;
  } catch (error) {
    cached.promise = null; // Reset on error
    cached.conn = null;
    throw error;
  }
}

export function getDB() {
  return mongoose.connection;
}

/** Traceability: FR-01 to FR-03 depend on DB-backed users and token blacklist storage. */