import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type FontSize = "normal" | "large" | "extra-large";

interface AccessibilityContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
  ttsEnabled: boolean;
  setTtsEnabled: (enabled: boolean) => void;
  speak: (text: string) => void;
  stopSpeaking: () => void;
  isReadingSequence: boolean;
  currentSpokenText: string;
  speakTextWithHighlight: (text: string, onBoundary: (charIndex: number) => void, onEnd: () => void) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>("normal");
  const [highContrast, setHighContrastState] = useState(false);
  const [ttsEnabled, setTtsEnabledState] = useState(false);
  const [isReadingSequence, setIsReadingSequence] = useState(false);
  const [currentSpokenText, setCurrentSpokenText] = useState("");

  // Initialize from localStorage
  useEffect(() => {
    const savedFontSize = localStorage.getItem("plenitude:accessibility:fontSize") as FontSize;
    const savedHighContrast = localStorage.getItem("plenitude:accessibility:highContrast") === "true";
    const savedTts = localStorage.getItem("plenitude:accessibility:tts") === "true";

    if (savedFontSize) setFontSizeState(savedFontSize);
    setHighContrastState(savedHighContrast);
    setTtsEnabledState(savedTts);
  }, []);

  // Persist and apply classes
  useEffect(() => {
    const root = document.documentElement;
    
    // Font size
    root.classList.remove("font-large", "font-extra-large");
    if (fontSize === "large") root.classList.add("font-large");
    if (fontSize === "extra-large") root.classList.add("font-extra-large");
    localStorage.setItem("plenitude:accessibility:fontSize", fontSize);

    // High contrast
    if (highContrast) {
      root.classList.add("high-contrast");
    } else {
      root.classList.remove("high-contrast");
    }
    localStorage.setItem("plenitude:accessibility:highContrast", String(highContrast));

    // TTS
    localStorage.setItem("plenitude:accessibility:tts", String(ttsEnabled));
  }, [fontSize, highContrast, ttsEnabled]);

  const setFontSize = (size: FontSize) => setFontSizeState(size);
  const setHighContrast = (enabled: boolean) => setHighContrastState(enabled);
  const setTtsEnabled = (enabled: boolean) => setTtsEnabledState(enabled);

  const speak = (text: string) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  const stopSpeaking = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };
  
  const speakTextWithHighlight = (text: string, onBoundary: (charIndex: number) => void, onEnd: () => void) => {
    if (!window.speechSynthesis) return;
    
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "pt-BR";
    utterance.rate = 1.0;
    
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        onBoundary(event.charIndex);
      }
    };
    
    utterance.onstart = () => {
      setIsReadingSequence(true);
      setCurrentSpokenText(text);
    };
    
    utterance.onend = () => {
      setIsReadingSequence(false);
      setCurrentSpokenText("");
      onEnd();
    };
    
    utterance.onerror = () => {
      setIsReadingSequence(false);
      setCurrentSpokenText("");
      onEnd();
    };

    window.speechSynthesis.speak(utterance);
  };

  // Listen for mouseover events for TTS
  useEffect(() => {
    if (!ttsEnabled) return;

    const handleMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const textToRead = target.getAttribute("aria-label") || target.title || target.innerText;
      
      if (textToRead && textToRead.trim().length > 0) {
        // Debounce or prevent repeated reading of the same element
        speak(textToRead.slice(0, 200)); // Limit length
      }
    };

    window.addEventListener("mouseover", handleMouseOver);
    return () => window.removeEventListener("mouseover", handleMouseOver);
  }, [ttsEnabled]);

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        setFontSize,
        highContrast,
        setHighContrast,
        ttsEnabled,
        setTtsEnabled,
        speak,
        stopSpeaking,
        isReadingSequence,
        currentSpokenText,
        speakTextWithHighlight
      }}
    >
      {children}
    </AccessibilityContext.Provider>
  );
}

export function useAccessibility() {
  const context = useContext(AccessibilityContext);
  if (context === undefined) {
    throw new Error("useAccessibility must be used within an AccessibilityProvider");
  }
  return context;
}
