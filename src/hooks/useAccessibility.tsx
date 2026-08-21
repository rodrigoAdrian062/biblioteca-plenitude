import React, { createContext, useContext, useEffect, useState, ReactNode } from "react";

export type FontSize = "normal" | "large" | "extra-large";

interface AccessibilityContextType {
  fontSize: FontSize;
  setFontSize: (size: FontSize) => void;
  highContrast: boolean;
  setHighContrast: (enabled: boolean) => void;
}

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [fontSize, setFontSizeState] = useState<FontSize>("normal");
  const [highContrast, setHighContrastState] = useState(false);

  // Initialize from localStorage
  useEffect(() => {
    const savedFontSize = localStorage.getItem("plenitude:accessibility:fontSize") as FontSize;
    const savedHighContrast = localStorage.getItem("plenitude:accessibility:highContrast") === "true";
    

    if (savedFontSize) setFontSizeState(savedFontSize);
    setHighContrastState(savedHighContrast);
    
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
  }, [fontSize, highContrast]);


  const setFontSize = (size: FontSize) => setFontSizeState(size);
  const setHighContrast = (enabled: boolean) => setHighContrastState(enabled);

  return (
    <AccessibilityContext.Provider
      value={{
        fontSize,
        setFontSize,
        highContrast,
        setHighContrast,
        
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
