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

  // Create a new action for a specific petition
  const createPetitionAction = useCallback(async (petitionId: string) => {
    try {
      const response = await fetch('/api/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_API_KEY}`,
        },
        body: JSON.stringify({
          action: `sign-petition-${petitionId}`,
          name: `Sign Petition ${petitionId}`,
          description: `Sign the petition with ID ${petitionId}`,
          max_verifications: 1,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        console.error('Failed to create petition action:', data);
        throw new Error(data.detail || 'Failed to create petition action');
      }
      return data;
    } catch (error) {
      console.error('Error creating petition action:', error);
      //throw error;
    }
  }, []);

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
          const petitionData = await response.json();
          // Create a new action for this petition
          await createPetitionAction(petitionData.id);
          
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
  }, [isInstalled, newPetition, fetchPetitions, createPetitionAction]);

  // Handle petition signing
  const handleSignPetition = useCallback(async (petitionId: string) => {
    if (!isInstalled) return;

    setVerificationState('pending');
    try {
      // Verify user with World ID using the petition-specific action
      const result = await MiniKit.commandsAsync.verify({
        action: `sign-petition-${petitionId}`,
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
          action: `sign-petition-${petitionId}`,
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
            onClick={() => {
              console.log('Current Petitions Data:', JSON.stringify(petitions, null, 2));
            }}
            variant="secondary"
            size="sm"
          >
            Debug Data
          </Button>
          <Button
            onClick={() => setIsCreating(true)}
            variant="primary"
            size="sm"
          >
            Create New Petition
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
      />

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