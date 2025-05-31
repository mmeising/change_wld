'use client';
import { Button, LiveFeedback } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit, VerificationLevel } from '@worldcoin/minikit-js';
import { useState } from 'react';

/**
 * This component is an example of how to use World ID in Mini Apps
 * Minikit commands must be used on client components
 * It's critical you verify the proof on the server side
 * Read More: https://docs.world.org/mini-apps/commands/verify#verifying-the-proof
 */
export const Verify = () => {
  const [buttonState, setButtonState] = useState<
    'pending' | 'success' | 'failed' | undefined
  >(undefined);

  const [whichVerification, setWhichVerification] = useState<VerificationLevel>(
    VerificationLevel.Orb, // Default to Orb verification for stronger security
  );

  const onClickVerify = async (verificationLevel: VerificationLevel) => {
    setButtonState('pending');
    setWhichVerification(verificationLevel);
    try {
      const result = await MiniKit.commandsAsync.verify({
        action: 'create-petition',
        verification_level: verificationLevel,
      });
      console.log('Verification result:', result.finalPayload);

      if (result.finalPayload.status === 'error') {
        console.error('Verification failed - client error:', {
          error: result.finalPayload,
          verification_level: verificationLevel,
        });
        setButtonState('failed');
        setTimeout(() => setButtonState(undefined), 2000);
        return;
      }

      // Verify the proof
      const response = await fetch('/api/verify-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: result.finalPayload,
          action: 'create-petition',
        }),
      });

      const data = await response.json();
      if (data.verifyRes.success) {
        console.log('Verification successful:', {
          verification_level: verificationLevel,
        });
        setButtonState('success');
      } else {
        console.error('Verification failed - server error:', {
          error: data.verifyRes,
          verification_level: verificationLevel,
        });
        setButtonState('failed');
        setTimeout(() => setButtonState(undefined), 2000);
      }
    } catch (error) {
      console.error('Verification error - unexpected:', {
        error,
        verification_level: verificationLevel,
      });
      setButtonState('failed');
      setTimeout(() => setButtonState(undefined), 2000);
    }
  };

  return (
    <div className="grid w-full gap-4">
      <p className="text-lg font-semibold">Verify</p>
      <LiveFeedback
        label={{
          failed: 'Failed to verify',
          pending: 'Verifying',
          success: 'Verified',
        }}
        state={
          whichVerification === VerificationLevel.Orb
            ? buttonState
            : undefined
        }
        className="w-full"
      >
        <Button
          onClick={() => onClickVerify(VerificationLevel.Orb)}
          disabled={buttonState === 'pending'}
          size="lg"
          variant="tertiary"
          className="w-full"
        >
          Verify (Device)
        </Button>
      </LiveFeedback>
      <LiveFeedback
        label={{
          failed: 'Failed to verify',
          pending: 'Verifying',
          success: 'Verified',
        }}
        state={
          whichVerification === VerificationLevel.Orb ? buttonState : undefined
        }
        className="w-full"
      >
        <Button
          onClick={() => onClickVerify(VerificationLevel.Orb)}
          disabled={buttonState === 'pending'}
          size="lg"
          variant="primary"
          className="w-full"
        >
          Verify (Orb)
        </Button>
      </LiveFeedback>
    </div>
  );
};
