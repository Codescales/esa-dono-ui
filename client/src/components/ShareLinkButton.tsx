import { useState } from 'react';
import { ClipboardIcon } from './icons';

/** Copies a shareable permalink to the clipboard. Shows a brief "copied"
 * confirmation so the runner gets feedback without a toast system. */
export default function ShareLinkButton({ path }: { path: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    const url = `${window.location.origin}${path}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable (e.g. insecure context) — do nothing.
    }
  };

  return (
    <button
      onClick={handleCopy}
      className="btrl-button btrl-button-ghost text-xs flex items-center gap-1"
      title="Copy a link that pre-fills this item into a donor's cart"
    >
      <ClipboardIcon className="w-3.5 h-3.5" />
      {copied ? 'copied!' : 'share'}
    </button>
  );
}
