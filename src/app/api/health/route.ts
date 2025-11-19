import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectDB } from '@/lib/db';

/**
 * Health check endpoint to verify MongoDB connection
 * GET /api/health
 */
export async function GET() {
  const health: any = {
    timestamp: new Date().toISOString(),
    mongodb: {
      configured: !!process.env.MONGODB_URI,
      connected: false,
      readyState: mongoose.connection.readyState,
      readyStateText: ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown',
      error: null,
    },
    env: {
      mongodb_uri_set: !!process.env.MONGODB_URI,
      jwt_secret_set: !!process.env.JWT_SECRET,
      node_env: process.env.NODE_ENV,
    },
  };

  if (process.env.MONGODB_URI) {
    try {
      await connectDB();
      // Wait a bit for connection to fully establish
      await new Promise(resolve => setTimeout(resolve, 100));
      health.mongodb.connected = mongoose.connection.readyState === 1;
      health.mongodb.dbName = mongoose.connection.db?.databaseName;
      health.mongodb.host = mongoose.connection.host;
      health.mongodb.readyState = mongoose.connection.readyState;
      health.mongodb.readyStateText = ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] || 'unknown';
    } catch (error: any) {
      health.mongodb.error = error.message;
      health.mongodb.connected = false;
    }
  }

  return NextResponse.json(health, {
    status: health.mongodb.connected ? 200 : 503,
  });
}

