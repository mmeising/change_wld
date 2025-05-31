'use client';

import { Button, LiveFeedback, ListItem } from '@worldcoin/mini-apps-ui-kit-react';
import { MiniKit, ResponseEvent, VerificationLevel } from '@worldcoin/minikit-js';
import { useMiniKit } from '@worldcoin/minikit-js/minikit-provider';
import { useCallback, useEffect, useState } from 'react';

interface Petition {
  id: string;
  title: string;
  description: string;
  signatureCount: number;
  createdAt: string;
}

export const Petitions = () => {
  const [petitions, setPetitions] = useState<Petition[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [newPetition, setNewPetition] = useState({ title: '', description: '' });
  const [verificationState, setVerificationState] = useState<'pending' | 'success' | 'failed' | undefined>(undefined);
  const { isInstalled } = useMiniKit();

  // Fetch petitions
  const fetchPetitions = useCallback(async () => {
    try {
      const response = await fetch('/api/petitions');
      const data = await response.json();
      setPetitions(data.petitions);
    } catch (error) {
      console.error('Failed to fetch petitions:', error);
    }
  }, []);

  useEffect(() => {
    fetchPetitions();
  }, [fetchPetitions]);

  // Handle petition creation
  const handleCreatePetition = useCallback(async () => {
    if (!isInstalled) return;

    setVerificationState('pending');
    try {
      // Verify user with World ID
      const result = await MiniKit.commandsAsync.verify({
        action: 'create-petition',
        verification_level: VerificationLevel.Orb,
      });

      console.log('Verification result:', result.finalPayload);

      if (result.finalPayload.status === 'error') {
        console.error('Verification failed - client error:', {
          error: result.finalPayload,
        });
        setVerificationState('failed');
        return;
      }

      // Verify the proof
      const verifyResponse = await fetch('/api/verify-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: result.finalPayload,
          action: 'create-petition',
        }),
      });

      const data = await verifyResponse.json();
      if (data.verifyRes.success) {
        console.log('Verification successful, creating petition...');
        setVerificationState('success');
        
        // Create the petition only after successful verification
        const response = await fetch('/api/petitions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(newPetition),
        });
        
        if (response.ok) {
          setNewPetition({ title: '', description: '' });
          setIsCreating(false);
          fetchPetitions();
        } else {
          console.error('Failed to create petition:', await response.text());
          setVerificationState('failed');
        }
      } else {
        console.error('Verification failed - server error:', {
          error: data.verifyRes,
        });
        setVerificationState('failed');
      }
    } catch (error) {
      console.error('Error creating petition:', error);
      setVerificationState('failed');
    }
  }, [isInstalled, newPetition, fetchPetitions]);

  // Handle petition signing
  const handleSignPetition = useCallback(async (petitionId: string) => {
    if (!isInstalled) return;

    setVerificationState('pending');
    try {
      // Verify user with World ID
      const result = await MiniKit.commandsAsync.verify({
        action: 'sign-petition',
        verification_level: VerificationLevel.Orb,
      });

      console.log('Verification result:', result.finalPayload);

      if (result.finalPayload.status === 'error') {
        console.error('Verification failed - client error:', {
          error: result.finalPayload,
        });
        setVerificationState('failed');
        return;
      }

      // Verify the proof
      const verifyResponse = await fetch('/api/verify-proof', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payload: result.finalPayload,
          action: 'sign-petition',
        }),
      });

      const data = await verifyResponse.json();
      if (data.verifyRes.success) {
        console.log('Verification successful, signing petition...');
        setVerificationState('success');
        
        // Sign the petition only after successful verification
        const response = await fetch('/api/petitions', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: petitionId }),
        });

        if (response.ok) {
          fetchPetitions();
        } else {
          console.error('Failed to sign petition:', await response.text());
          setVerificationState('failed');
        }
      } else {
        console.error('Verification failed - server error:', {
          error: data.verifyRes,
        });
        setVerificationState('failed');
      }
    } catch (error) {
      console.error('Error signing petition:', error);
      setVerificationState('failed');
    }
  }, [isInstalled, fetchPetitions]);

  return (
    <div className="grid w-full gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Petitions</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsCreating(true)}
            variant="primary"
            size="sm"
          >
            Create New Petition
          </Button>
          {/* Debug buttons */}
          <Button
            onClick={() => {
              console.log('Current petitions:', petitions.map(p => ({
                id: p.id,
                title: p.title,
                signatureCount: p.signatureCount
              })));
            }}
            variant="secondary"
            size="sm"
          >
            Debug: Log Petitions
          </Button>
          <Button
            onClick={async () => {
              try {
                const response = await fetch("/api/actions?app_id=${NEXT_PUBLIC_APP_ID}", {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    "x-api-key": process.env.WORLD_ID_API_KEY || "",
                  },
                  body: JSON.stringify({
                    action: 'sign-petition-hlud2l',
                    name: 'Sign Petition',
                    description: 'Sign petition hlud2l as a verified human',
                    max_verifications: 1
                  })
                });

                if (!response.ok) {
                  const errorData = await response.json();
                  console.error("Error creating action:", errorData);
                  return;
                }

                const data = await response.json();
                console.log('Created action:', data);
              } catch (error) {
                console.error('Error creating action:', error);
              }
            }}
            variant="secondary"
            size="sm"
          >
            Debug: Create Action
          </Button>
          <Button
            onClick={async () => {
              try {
                // Test RPC connection
                const response = await fetch('https://worldchain-mainnet.g.alchemy.com/public', {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    jsonrpc: '2.0',
                    id: 1,
                    method: 'eth_blockNumber',
                    params: []
                  })
                });
                const data = await response.json();
                console.log('RPC Test Response:', data);
              } catch (error) {
                console.error('RPC Test Error:', error);
              }
            }}
            variant="secondary"
            size="sm"
          >
            Debug: Test RPC
          </Button>
          <Button
            onClick={async () => {
              try {
                const response = await fetch('/api/auth/session');
                const data = await response.json();
                console.log('Current Session:', data);
              } catch (error) {
                console.error('Session Error:', error);
              }
            }}
            variant="secondary"
            size="sm"
          >
            Debug: Check Session
          </Button>
        </div>
      </div>

      {isCreating && (
        <div className="grid gap-4 p-4 border rounded-lg">
          <input
            type="text"
            placeholder="Petition Title"
            value={newPetition.title}
            onChange={(e) => setNewPetition(prev => ({ ...prev, title: e.target.value }))}
            className="p-2 border rounded"
          />
          <textarea
            placeholder="Petition Description"
            value={newPetition.description}
            onChange={(e) => setNewPetition(prev => ({ ...prev, description: e.target.value }))}
            className="p-2 border rounded"
            rows={3}
          />
          <div className="flex gap-2">
            <Button
              onClick={handleCreatePetition}
              variant="primary"
              disabled={!newPetition.title || !newPetition.description}
            >
              Create Petition
            </Button>
            <Button
              onClick={() => {
                setIsCreating(false);
                setNewPetition({ title: '', description: '' });
              }}
              variant="secondary"
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      <LiveFeedback
        label={{
          pending: 'Verifying...',
          success: 'Verified!',
          failed: 'Verification failed',
        }}
        state={verificationState}
      >
        <div /> {/* Add empty div as children to fix linter error */}
      </LiveFeedback>

      {petitions.map((petition) => (
        <div key={petition.id} className="border rounded-lg p-4">
          <h3 className="text-lg font-semibold">{petition.title}</h3>
          <p className="text-gray-600 mt-2">{petition.description}</p>
          <div className="flex justify-between items-center mt-4">
            <span className="text-sm text-gray-500">
              {petition.signatureCount} signatures
            </span>
            <Button
              onClick={() => handleSignPetition(petition.id)}
              variant="secondary"
              size="sm"
            >
              Sign Petition
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}; 