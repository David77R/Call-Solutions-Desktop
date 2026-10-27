import { useEffect, useState } from 'react';
import { useProtocolAlerts } from '../lib/protocol';

function read() {
  try {
    return localStorage.getItem('ccs_protocol_alerts') === 'on';
  } catch {
    return false;
  }
}

export default function ProtocolAlerts() {
  const [enabled, setEnabled] = useState(read);

  useEffect(() => {
    const sync = () => setEnabled(read());
    window.addEventListener('ccs-protocol-alerts', sync);
    return () => window.removeEventListener('ccs-protocol-alerts', sync);
  }, []);

  useProtocolAlerts(enabled);
  return null;
}
