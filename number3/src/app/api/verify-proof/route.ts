import {
  ISuccessResult,
  IVerifyResponse,
  verifyCloudProof,
  MiniAppVerifyActionPayload,
} from '@worldcoin/minikit-js';
import { NextRequest, NextResponse } from 'next/server';

interface IRequestPayload {
  payload: MiniAppVerifyActionPayload;
  action: string;
  signal: string | undefined;
}

/**
 * This route is used to verify the proof of the user
 * It is critical proofs are verified from the server side
 * Read More: https://docs.world.org/mini-apps/commands/verify#verifying-the-proof
 */
export async function POST(req: NextRequest) {
  const { payload, action, signal } = (await req.json()) as IRequestPayload;
  const app_id = process.env.NEXT_PUBLIC_APP_ID as `app_${string}`;

  console.log('Verification attempt:', {
    action,
    signal,
    app_id,
    payload_status: payload.status,
  });

  if (payload.status === 'error') {
    console.error('Verification failed - client error:', {
      action,
      error: payload,
    });
    return NextResponse.json({ error: payload }, { status: 400 });
  }

  const verifyRes = (await verifyCloudProof(
    payload as ISuccessResult,
    app_id,
    action,
    signal,
  )) as IVerifyResponse;

  if (verifyRes.success) {
    console.log('Verification successful:', {
      action,
      verification_level: payload.verification_level,
    });
    return NextResponse.json({ verifyRes, status: 200 });
  } else {
    console.error('Verification failed - server error:', {
      action,
      verification_level: payload.verification_level,
      error: verifyRes,
      app_id,
      payload: {
        merkle_root: payload.merkle_root,
        nullifier_hash: payload.nullifier_hash,
      },
    });
    return NextResponse.json({ verifyRes, status: 400 });
  }
}
