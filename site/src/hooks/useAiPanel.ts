import { useState, useEffect } from 'react';

const EVENT_NAME = 'fdl-ai-toggle';

export function useAiPanel() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const handler = () => setOpen(prev => !prev);
    window.addEventListener(EVENT_NAME, handler);
    return () => window.removeEventListener(EVENT_NAME, handler);
  }, []);

  const toggle = () => {
    window.dispatchEvent(new CustomEvent(EVENT_NAME));
  };

  return { open, setOpen, toggle };
}
