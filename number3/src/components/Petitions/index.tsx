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

      if (result.finalPayload.status === 'success') {
        // Verify the proof
        const verifyResponse = await fetch('/api/verify-proof', {
          method: 'POST',
          body: JSON.stringify({
            payload: result.finalPayload,
            action: 'create-petition',
          }),
        });

        const data = await verifyResponse.json();
        if (data.verifyRes.success) {
          setVerificationState('success');
          // Create the petition
          const response = await fetch('/api/petitions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newPetition),
          });
          
          if (response.ok) {
            setNewPetition({ title: '', description: '' });
            setIsCreating(false);
            fetchPetitions();
          }
        } else {
          setVerificationState('failed');
        }
      } else {
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

    try {
      const response = await fetch('/api/petitions', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: petitionId }),
      });

      if (response.ok) {
        fetchPetitions();
      }
    } catch (error) {
      console.error('Error signing petition:', error);
    }
  }, [isInstalled, fetchPetitions]);

  return (
    <div className="grid w-full gap-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-semibold">Petitions</h2>
        <Button
          onClick={() => setIsCreating(true)}
          variant="primary"
          size="sm"
        >
          Create New Petition
        </Button>
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