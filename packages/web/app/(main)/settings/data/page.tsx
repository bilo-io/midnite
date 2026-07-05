import { Suspense } from 'react';
import { DataView } from './data-view';

export default function SettingsDataPage() {
  return (
    <Suspense fallback={null}>
      <DataView />
    </Suspense>
  );
}
