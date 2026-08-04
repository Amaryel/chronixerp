/**
 * Aquinos Frios - PWA Installation Banner
 */

import React, { useState, useEffect } from 'react';
import { Smartphone, Download, X } from 'lucide-react';

export const PWAInstallBanner: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed top-16 left-4 right-4 md:left-auto md:right-4 md:max-w-sm z-50 bg-gradient-to-r from-blue-600 to-indigo-700 text-white p-4 rounded-2xl shadow-2xl border border-blue-400/30 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-xl bg-white/20">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div>
          <h4 className="font-extrabold text-xs">Instalar Aquinos Frios</h4>
          <p className="text-[11px] text-blue-100">Adicione à tela inicial para usar offline.</p>
        </div>
      </div>

      <div className="flex items-center gap-1">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 bg-white text-blue-700 hover:bg-blue-50 font-extrabold text-xs rounded-lg shadow-sm"
        >
          Instalar
        </button>
        <button
          onClick={() => setIsVisible(false)}
          className="p-1 hover:bg-white/10 rounded-lg text-white/80"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
