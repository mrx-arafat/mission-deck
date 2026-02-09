'use client';

import { MissionProvider } from './lib/store';
import MissionControl from './components/MissionControl';

export default function Home() {
  return (
    <MissionProvider>
      <MissionControl />
    </MissionProvider>
  );
}
