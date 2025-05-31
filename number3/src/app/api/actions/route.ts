import { NextRequest, NextResponse } from 'next/server';
import * as yup from 'yup';

const createActionBodySchema = yup.object({
  action: yup.string().strict().required(),
  name: yup.string().required(),
  description: yup.string().required(),
  max_verifications: yup.number().required(),
});

export async function POST(req: NextRequest) {
  const api_key = process.env.WORLD_ID_API_KEY;

  if (!api_key) {
    return NextResponse.json(
      {
        code: 'unauthorized',
        detail: 'API key is required.',
        attribute: 'api_key',
      },
      { status: 401 }
    );
  }

  try {
    const rawBody = await req.json();
    const body = await createActionBodySchema.validate(rawBody);

    const { action, name, description, max_verifications } = body;
    const app_id = process.env.APP_ID;

    if (!app_id) {
      return NextResponse.json(
        {
          code: 'server_configuration_error',
          detail: 'APP_ID is not configured.',
        },
        { status: 500 }
      );
    }

    // Create the action using the World ID API v2
    const response = await fetch(`https://developer.worldcoin.org/api/v2/create-action/${app_id}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${api_key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        action,
        name,
        description,
        max_verifications,
      }),
    });

    // Log the raw response for debugging
    console.log('Raw response:', {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
    });

    // Get the response text first
    const responseText = await response.text();
    console.log('Response text:', responseText);

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('Failed to parse response as JSON:', e);
      return NextResponse.json(
        {
          code: 'invalid_response',
          detail: 'Received invalid response from World ID API',
          raw_response: responseText,
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('Failed to create action:', {
        status: response.status,
        data,
        app_id,
        action,
      });
      return NextResponse.json(
        {
          code: 'action_creation_failed',
          detail: data.detail || 'Failed to create action',
          attribute: 'action',
        },
        { status: response.status }
      );
    }

    return NextResponse.json({ action: data }, { status: 200 });
  } catch (error) {
    if (error instanceof yup.ValidationError) {
      return NextResponse.json(
        {
          code: 'validation_error',
          detail: error.message,
          attribute: error.path,
        },
        { status: 400 }
      );
    }

    console.error('Error creating action:', error);
    return NextResponse.json(
      {
        code: 'internal_server_error',
        detail: 'Action can\'t be created.',
      },
      { status: 500 }
    );
  }
} 