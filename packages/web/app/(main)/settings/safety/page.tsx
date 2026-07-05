import { Suspense } from 'react';
import { SafetyView } from './safety-view';

export default function SettingsSafetyPage() {
  return (
    <Suspense fallback={null}>
      <SafetyView />
    </Suspense>
  );
}
