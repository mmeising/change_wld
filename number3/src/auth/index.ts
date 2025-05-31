import { hashNonce } from '@/auth/wallet/client-helpers';
import {
  MiniAppWalletAuthSuccessPayload,
  MiniKit,
  verifySiweMessage,
} from '@worldcoin/minikit-js';
import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

// Add retry logic with exponential backoff
const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (error instanceof Error && error.message.includes('429')) {
        const delay = baseDelay * Math.pow(2, i);
        console.log(`Rate limited, retrying in ${delay}ms...`);
        await sleep(delay);
        continue;
      }
      throw error;
    }
  }
  throw lastError!;
};

declare module 'next-auth' {
  interface User {
    walletAddress: string;
    username: string;
    profilePictureUrl: string;
  }

  interface Session {
    user: {
      walletAddress: string;
      username: string;
      profilePictureUrl: string;
    } & DefaultSession['user'];
  }
}

// Auth configuration for Wallet Auth based sessions
// For more information on each option (and a full list of options) go to
// https://authjs.dev/getting-started/authentication/credentials
export const { handlers, signIn, signOut, auth } = NextAuth({
  secret: process.env.NEXTAUTH_SECRET,
  session: { strategy: 'jwt' },
  providers: [
    Credentials({
      name: 'World App Wallet',
      credentials: {
        nonce: { label: 'Nonce', type: 'text' },
        signedNonce: { label: 'Signed Nonce', type: 'text' },
        finalPayloadJson: { label: 'Final Payload', type: 'text' },
      },
      // @ts-expect-error TODO
      authorize: async ({
        nonce,
        signedNonce,
        finalPayloadJson,
      }: {
        nonce: string;
        signedNonce: string;
        finalPayloadJson: string;
      }) => {
        try {
          const expectedSignedNonce = hashNonce({ nonce });

          if (signedNonce !== expectedSignedNonce) {
            console.error('Invalid signed nonce');
            return null;
          }

          const finalPayload: MiniAppWalletAuthSuccessPayload =
            JSON.parse(finalPayloadJson);

          // Add retry logic for SIWE verification
          const result = await retryWithBackoff(async () => {
            try {
              // Use a different RPC endpoint for verification
              const customRpcUrl = process.env.NEXT_PUBLIC_RPC_URL || 'https://eth-mainnet.g.alchemy.com/v2/your-api-key';
              return await verifySiweMessage(finalPayload, nonce, customRpcUrl);
            } catch (error) {
              console.error('SIWE verification error:', error);
              throw error;
            }
          });

          if (!result.isValid || !result.siweMessageData.address) {
            console.error('Invalid final payload:', {
              isValid: result.isValid,
              address: result.siweMessageData.address,
            });
            return null;
          }

          // Add retry logic for user info fetch
          const userInfo = await retryWithBackoff(async () => {
            try {
              return await MiniKit.getUserInfo(finalPayload.address);
            } catch (error) {
              console.error('Error fetching user info:', error);
              // Return basic user info if fetch fails
              return {
                walletAddress: finalPayload.address,
                username: 'Anonymous',
                profilePictureUrl: '',
              };
            }
          });

          return {
            id: finalPayload.address,
            ...userInfo,
          };
        } catch (error) {
          console.error('Auth error:', error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.walletAddress = user.walletAddress;
        token.username = user.username;
        token.profilePictureUrl = user.profilePictureUrl;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (token.userId) {
        session.user.id = token.userId as string;
        session.user.walletAddress = token.address as string;
        session.user.username = token.username as string;
        session.user.profilePictureUrl = token.profilePictureUrl as string;
      }

      return session;
    },
  },
});
