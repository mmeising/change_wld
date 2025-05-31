import { NextRequest, NextResponse } from 'next/server';
import { createHmac, randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import path from 'path';

// File to store petitions
const PETITIONS_FILE = path.join(process.cwd(), 'data', 'petitions.json');

// Function to generate a hashed ID
function generateHashedId(): string {
  const randomNumber = randomBytes(16).toString('hex');
  const hmac = createHmac('sha256', process.env.HMAC_SECRET_KEY || 'default-secret');
  hmac.update(randomNumber);
  const hashedId = hmac.digest('hex');
  console.log('Generated ID:', { randomNumber, hashedId });
  return hashedId;
}

// Function to read petitions from file
async function readPetitions(): Promise<Array<{
  id: string;
  title: string;
  description: string;
  signatureCount: number;
  createdAt: string;
}>> {
  try {
    await fs.mkdir(path.dirname(PETITIONS_FILE), { recursive: true });
    const data = await fs.readFile(PETITIONS_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // If file doesn't exist or is invalid, return empty array
    return [];
  }
}

// Function to save petitions to file
async function savePetitions(petitions: Array<{
  id: string;
  title: string;
  description: string;
  signatureCount: number;
  createdAt: string;
}>): Promise<void> {
  await fs.mkdir(path.dirname(PETITIONS_FILE), { recursive: true });
  await fs.writeFile(PETITIONS_FILE, JSON.stringify(petitions, null, 2));
}

export async function GET() {
  const petitions = await readPetitions();
  console.log('GET /api/petitions - Current petitions:', petitions);
  return NextResponse.json({ petitions });
}

export async function POST(req: NextRequest) {
  const { title, description } = await req.json();
  
  const newPetition = {
    id: generateHashedId(),
    title,
    description,
    signatureCount: 0,
    createdAt: new Date().toISOString(),
  };
  
  const petitions = await readPetitions();
  
  console.log('Creating new petition:', { 
    id: newPetition.id,
    existingIds: petitions.map(p => p.id),
    petition: newPetition
  });
  
  petitions.push(newPetition);
  await savePetitions(petitions);
  
  console.log('Petitions after push:', petitions);
  return NextResponse.json(newPetition);
}

export async function PUT(req: NextRequest) {
  const { id } = await req.json();
  
  const petitions = await readPetitions();
  
  console.log('Looking for petition:', { 
    searchId: id,
    availableIds: petitions.map(p => p.id)
  });
  
  const petition = petitions.find(p => p.id === id);
  if (!petition) {
    return NextResponse.json({ error: 'Petition not found' }, { status: 404 });
  }
  
  petition.signatureCount += 1;
  await savePetitions(petitions);
  
  return NextResponse.json(petition);
} 