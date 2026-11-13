'use client';
import { createContext, useContext, useState } from 'react';
const SignupDraft = createContext<{ email: string; setEmail: (email: string) => void }>({
  email: '',
  setEmail: () => undefined,
});
export function SignupDraftProvider({ children }: { children: React.ReactNode }) {
  const [email, setEmail] = useState('');
  return <SignupDraft.Provider value={{ email, setEmail }}>{children}</SignupDraft.Provider>;
}
export const useSignupDraft = () => useContext(SignupDraft);
