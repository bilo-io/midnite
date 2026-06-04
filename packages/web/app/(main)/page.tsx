'use client';

import { useEffect, useState } from 'react';

// Greeting depends on the viewer's local time, so resolve it on the client after
// mount to avoid a server/client hydration mismatch.
function greetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 21) return 'Good evening';
  return 'Howzit nightowl';
}

export default function HomePage() {
  const [greeting, setGreeting] = useState<string | null>(null);

  useEffect(() => {
    setGreeting(greetingForHour(new Date().getHours()));
  }, []);

  return (
    <div className="bg-grid relative flex min-h-[100dvh] flex-col items-center justify-center px-6 text-center">
      <h1 className="bg-gradient-to-br from-foreground to-foreground/50 bg-clip-text text-4xl font-semibold tracking-tight text-transparent sm:text-6xl">
        {greeting ?? ' '}
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">Welcome back to midnite.</p>
    </div>
  );
}
