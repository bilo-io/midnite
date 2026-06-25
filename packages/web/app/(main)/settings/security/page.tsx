import { Suspense } from 'react';
import { SecurityView } from './security-view';

export default function SettingsSecurityPage() {
  return (
    <Suspense fallback={null}>
      <SecurityView />
    </Suspense>
  );
}
