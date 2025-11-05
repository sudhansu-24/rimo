/**
 * Checkout Session API
 * Manages checkout data storage in MongoDB instead of localStorage
 */
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth/next';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import CheckoutSession from '@/models/CheckoutSession';
import { v4 as uuidv4 } from 'uuid';

// POST: Create or update checkout session
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const body = await request.json();
    const { items, pricing, couponCode } = body;

    // Validate required fields
    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: 'Invalid items data' }, { status: 400 });
    }

    if (!pricing || typeof pricing.total !== 'number') {
      return NextResponse.json({ error: 'Invalid pricing data' }, { status: 400 });
    }

    // Generate session ID
    const sessionId = uuidv4();

    // Create checkout session
    const checkoutSession = new CheckoutSession({
      sessionId,
      userId: session.user.id,
      items,
      pricing,
      couponCode: couponCode || '',
      status: 'active'
    });

    await checkoutSession.save();

    return NextResponse.json({ 
      success: true, 
      sessionId,
      message: 'Checkout session created successfully'
    });

  } catch (error) {
    console.error('Error creating checkout session:', error);
    return NextResponse.json({ 
      error: 'Failed to create checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET: Retrieve checkout session
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Find checkout session
    const checkoutSession = await CheckoutSession.findOne({
      sessionId,
      userId: session.user.id,
      status: 'active'
    });

    if (!checkoutSession) {
      return NextResponse.json({ error: 'Checkout session not found or expired' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true, 
      data: {
        items: checkoutSession.items,
        pricing: checkoutSession.pricing,
        couponCode: checkoutSession.couponCode,
        deliveryAddress: checkoutSession.deliveryAddress,
        billingAddress: checkoutSession.billingAddress
      }
    });

  } catch (error) {
    console.error('Error retrieving checkout session:', error);
    return NextResponse.json({ 
      error: 'Failed to retrieve checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// PUT: Update checkout session with address data
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const body = await request.json();
    const { sessionId, deliveryAddress, billingAddress } = body;

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Update checkout session
    const checkoutSession = await CheckoutSession.findOneAndUpdate(
      {
        sessionId,
        userId: session.user.id,
        status: 'active'
      },
      {
        ...(deliveryAddress && { deliveryAddress }),
        ...(billingAddress && { billingAddress })
      },
      { new: true }
    );

    if (!checkoutSession) {
      return NextResponse.json({ error: 'Checkout session not found or expired' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Checkout session updated successfully'
    });

  } catch (error) {
    console.error('Error updating checkout session:', error);
    return NextResponse.json({ 
      error: 'Failed to update checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE: Mark session as completed or delete
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await dbConnect();
    
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json({ error: 'Session ID required' }, { status: 400 });
    }

    // Mark session as completed
    const checkoutSession = await CheckoutSession.findOneAndUpdate(
      {
        sessionId,
        userId: session.user.id
      },
      { status: 'completed' },
      { new: true }
    );

    if (!checkoutSession) {
      return NextResponse.json({ error: 'Checkout session not found' }, { status: 404 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Checkout session completed'
    });

  } catch (error) {
    console.error('Error completing checkout session:', error);
    return NextResponse.json({ 
      error: 'Failed to complete checkout session',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
