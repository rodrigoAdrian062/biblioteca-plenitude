import React from "react";
import { 
  Accessibility, 
  Type, 
  Contrast, 
  Volume2, 
  VolumeX,
  Plus,
  Minus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useAccessibility } from "@/hooks/useAccessibility";

export function AccessibilityMenu() {
  const { 
    fontSize, 
    setFontSize, 
    highContrast, 
    toggleHighContrast, 
    ttsEnabled, 
    toggleTTS 
  } = useAccessibility();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          title="Opções de Acessibilidade"
          aria-label="Acessibilidade"
        >
          <Accessibility className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Acessibilidade</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <div className="p-2 space-y-3">
          <div className="flex flex-col gap-2">
            <span className="text-xs font-medium flex items-center gap-2">
              <Type className="h-3 w-3" /> Tamanho da Fonte
            </span>
            <div className="flex items-center justify-between gap-1">
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setFontSize(Math.max(0, fontSize - 1))}
                disabled={fontSize === 0}
              >
                <Minus className="h-3 w-3" />
              </Button>
              <span className="text-xs">
                {fontSize === 0 ? "Normal" : fontSize === 1 ? "Grande" : "Extra Grande"}
              </span>
              <Button 
                variant="outline" 
                size="icon" 
                className="h-8 w-8"
                onClick={() => setFontSize(Math.min(2, fontSize + 1))}
                disabled={fontSize === 2}
              >
                <Plus className="h-3 w-3" />
              </Button>
            </div>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuCheckboxItem
          checked={highContrast}
          onCheckedChange={toggleHighContrast}
        >
          <div className="flex items-center gap-2">
            <Contrast className="h-4 w-4" />
            Alto Contraste
          </div>
        </DropdownMenuCheckboxItem>

        <DropdownMenuCheckboxItem
          checked={ttsEnabled}
          onCheckedChange={toggleTTS}
        >
          <div className="flex items-center gap-2">
            {ttsEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
            Leitura por Voz
          </div>
        </DropdownMenuCheckboxItem>

        <DropdownMenuSeparator />
        <div className="px-2 py-1.5 text-[10px] text-muted-foreground leading-tight italic">
          * A leitura por voz permite ouvir o conteúdo ao passar o mouse ou selecionar textos.
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
