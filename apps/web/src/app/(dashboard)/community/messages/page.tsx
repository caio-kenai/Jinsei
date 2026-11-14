import { Suspense } from 'react';
import { MessagesScreen } from '@/features/community/messages-screen';
export default function Page() {
  return (
    <Suspense>
      <MessagesScreen />
    </Suspense>
  );
}
