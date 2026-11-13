import { AuthBoundary } from '@/features/auth/auth-boundary';
import { OnboardingForm } from '@/features/onboarding/onboarding-form';
export default function Page() {
  return (
    <AuthBoundary>
      <OnboardingForm />
    </AuthBoundary>
  );
}
