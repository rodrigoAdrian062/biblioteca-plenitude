import React, { createContext, useContext, useEffect, useState } from 'react';

type AccessibilityState = {
  fontSize: number; // 0 = normal, 1 = large, 2 = extra large
  highContrast: boolean;
  ttsEnabled: boolean;
};

type AccessibilityContextType = AccessibilityState & {
  setFontSize: (size: number) => void;
  toggleHighContrast: () => void;
  toggleTTS: () => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

const STORAGE_KEY = 'plenitude:accessibility';

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AccessibilityState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : { fontSize: 0, highContrast: false, ttsEnabled: false };
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    
    // Aplicar classes ao documento
    const doc = document.documentElement;
    
    // Font Size
    doc.classList.remove('text-lg', 'text-xl');
    if (state.fontSize === 1) doc.classList.add('text-lg');
    if (state.fontSize === 2) doc.classList.add('text-xl');
    
    // High Contrast
    if (state.highContrast) {
      doc.classList.add('high-contrast');
    } else {
      doc.classList.remove('high-contrast');
    }
  }, [state]);

  useEffect(() => {
    if (!state.ttsEnabled) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.innerText || target.title || target.getAttribute('aria-label'))) {
        const text = target.getAttribute('aria-label') || target.title || target.innerText;
        if (text && text.length < 500) {
          // Debounce ou check para não repetir o mesmo texto imediatamente
          speak(text);
        }
      }
    };

    document.addEventListener('mouseover', handleMouseOver);
    return () => document.removeEventListener('mouseover', handleMouseOver);
  }, [state.ttsEnabled]);

  const setFontSize = (fontSize: number) => setState(s => ({ ...s, fontSize }));
  const toggleHighContrast = () => setState(s => ({ ...s, highContrast: !s.highContrast }));
  const toggleTTS = () => {
    const newEnabled = !state.ttsEnabled;
    setState(s => ({ ...s, ttsEnabled: newEnabled }));
    if (!newEnabled) {
      window.speechSynthesis.cancel();
    }
  };

  const speak = (text: string) => {
    if (!state.ttsEnabled) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'pt-BR';
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    window.speechSynthesis.cancel();
  };

  return (
    <AccessibilityContext.Provider value={{ 
      ...state, 
      setFontSize, 
      toggleHighContrast, 
      toggleTTS,
      speak,
      stopSpeaking
    }}>
      {children}
    </AccessibilityContext.Provider>
  );
};

export const useAccessibility = () => {
  const context = useContext(AccessibilityContext);
  if (!context) throw new Error('useAccessibility must be used within AccessibilityProvider');
  return context;
};
