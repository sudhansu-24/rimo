/**
 * Debug Authentication API
 * Tests authentication and database connection for Vercel deployment
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { authOptions } from '@/lib/auth';

export async function GET(req: NextRequest) {
  try {
    // Test database connection
    await connectDB();
    
    // Test session
    const session = await getServerSession(authOptions);
    
    // Test user count
    const userCount = await User.countDocuments();
    
    // Test environment variables
    const envVars = {
      NEXTAUTH_URL: process.env.NEXTAUTH_URL,
      NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET ? 'SET' : 'NOT SET',
      MONGODB_URI: process.env.MONGODB_URI ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    };
    
    return NextResponse.json({
      success: true,
      data: {
        session: session ? {
          user: {
            id: session.user.id,
            email: session.user.email,
            role: session.user.role
          }
        } : null,
        database: {
          connected: true,
          userCount
        },
        environment: envVars
      }
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: process.env.NODE_ENV === 'development' ? error instanceof Error ? error.stack : undefined : undefined
    }, { status: 500 });
  }
}
