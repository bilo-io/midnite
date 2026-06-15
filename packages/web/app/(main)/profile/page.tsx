import { UserRound } from 'lucide-react';
import { PageHeader } from '@/components/page-header';
import { ProfileView } from './profile-view';

export default function ProfilePage() {
  return (
    <div className="flex min-h-[100dvh] flex-col">
      <PageHeader
        title="Profile"
        icon={UserRound}
        description="Tell midnite about yourself and set guidelines for every session."
      />
      <ProfileView />
    </div>
  );
}
