import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Accessibility, Type, Contrast } from "lucide-react";
import { useAccessibility, FontSize } from "@/hooks/useAccessibility";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";

export function AccessibilityMenu() {
  const { 
    fontSize, setFontSize, 
    highContrast, setHighContrast, 
  } = useAccessibility();

  const fontSizes: { label: string; value: FontSize }[] = [
    { label: "Normal", value: "normal" },
    { label: "Grande", value: "large" },
    { label: "Extra Grande", value: "extra-large" },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          aria-label="Opções de Acessibilidade"
          title="Acessibilidade"
        >
          <Accessibility className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 p-4 space-y-4 bg-card border-border/60 backdrop-blur-lg">
        <DropdownMenuLabel className="px-0 font-display tracking-wider">Acessibilidade</DropdownMenuLabel>
        <DropdownMenuSeparator className="mx-0" />
        
        <div className="space-y-3">
          <div className="space-y-2">
            <Label className="text-xs font-medium flex items-center gap-2">
              <Type className="h-3 w-3" /> Tamanho da Fonte
            </Label>
            <div className="grid grid-cols-1 gap-1">
              {fontSizes.map((size) => (
                <Button
                  key={size.value}
                  variant={fontSize === size.value ? "default" : "outline"}
                  size="sm"
                  className="justify-start h-8 text-[11px]"
                  onClick={() => setFontSize(size.value)}
                >
                  {size.label}
                </Button>
              ))}
            </div>
          </div>

          <DropdownMenuSeparator className="mx-0" />

          <div className="flex items-center justify-between">
            <Label htmlFor="high-contrast" className="text-xs font-medium flex items-center gap-2 cursor-pointer">
              <Contrast className="h-3 w-3" /> Alto Contraste
            </Label>
            <Switch
              id="high-contrast"
              checked={highContrast}
              onCheckedChange={setHighContrast}
            />
          </div>

        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
