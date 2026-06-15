import { PageHeader } from '@/components/page-header';
import { SettingsView } from './settings-view';

export default function SettingsPage() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PageHeader title="Settings" icon="Settings" description="Tune how midnite runs your agents." />
      <SettingsView />
    </div>
  );
}
