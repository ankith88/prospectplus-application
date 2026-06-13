import { NextResponse } from 'next/server';
import { TicketFormSchema } from '@/lib/ticket-schema';
import { z } from 'zod';
import { firestore as db } from '@/lib/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Validate request body against our shared schema
    const validatedData = TicketFormSchema.parse(body);

    // In a real implementation, you'd likely ensure the user is authenticated here
    // For an external API, you might check for an API key or bearer token

    const ticketsRef = collection(db, 'tickets');
    
    const docRef = await addDoc(ticketsRef, {
      ...validatedData,
      createdAt: serverTimestamp(),
      status: 'Open', // Initial status
      source: 'API' // Mark as created via external API
    });

    return NextResponse.json({
      success: true,
      ticketId: docRef.id,
      message: 'Ticket created successfully'
    }, { status: 201 });

  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        details: error.errors
      }, { status: 400 });
    }
    
    console.error('Error creating ticket:', error);
    return NextResponse.json({
      success: false,
      error: 'Internal server error'
    }, { status: 500 });
  }
}
