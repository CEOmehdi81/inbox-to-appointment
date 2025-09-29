'use client';

import dynamic from 'next/dynamic';

// Load the heavy globe only on the client
const LiveImpl = dynamic(() => import('./_live-panel'), { ssr: false });

export default function LivePanelClient(props: any) {
  return <LiveImpl {...props} />;
}