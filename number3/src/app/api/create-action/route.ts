import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const app_id = process.env.APP_ID;
  const api_key = process.env.WORLD_ID_API_KEY;

  if (!app_id || !api_key) {
    return NextResponse.json(
      { error: 'Missing required environment variables' },
      { status: 500 }
    );
  }

  try {
    const { action, name, description, max_verifications } = await req.json();

    const response = await fetch('https://developer.worldcoin.org/api/v1/actions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${api_key}`,
      },
      body: JSON.stringify({
        app_id,
        action,
        name: name || action,
        description: description || `Action for ${action}`,
        max_verifications: max_verifications || 1,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error('Error creating action:', data);
      return NextResponse.json(
        { error: data.detail || 'Failed to create action' },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 200 });
  } catch (error) {
    console.error('Error creating action:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
} 