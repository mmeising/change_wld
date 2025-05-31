import { NextRequest, NextResponse } from 'next/server';
import { createHmac } from 'crypto';

// In-memory storage for petitions (replace with database in production)
let petitions: Array<{
  id: string;
  title: string;
  description: string;
  signatureCount: number;
  createdAt: string;
}> = [];

// Keep track of the current index
let currentIndex = 0;

// Function to generate a hashed ID
function generateHashedId(index: number): string {
  const hmac = createHmac('sha256', process.env.HMAC_SECRET_KEY || 'default-secret');
  hmac.update(index.toString());
  return hmac.digest('hex');
}

export async function GET() {
  return NextResponse.json({ petitions });
}

export async function POST(req: NextRequest) {
  const { title, description } = await req.json();
  
  const newPetition = {
    id: generateHashedId(currentIndex++),
    title,
    description,
    signatureCount: 0,
    createdAt: new Date().toISOString(),
  };
  
  petitions.push(newPetition);
  return NextResponse.json(newPetition);
}

export async function PUT(req: NextRequest) {
  const { id } = await req.json();
  
  const petition = petitions.find(p => p.id === id);
  if (!petition) {
    return NextResponse.json({ error: 'Petition not found' }, { status: 404 });
  }
  
  petition.signatureCount += 1;
  return NextResponse.json(petition);
} 