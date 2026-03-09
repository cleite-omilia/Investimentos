"use client";

import { useState, useCallback, type ChangeEvent } from "react";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface CurrencyInputProps {
  value: number; // centavos
  onChange: (centavos: number) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

function formatCentavosToDisplay(centavos: number): string {
  if (centavos === 0) return "";
  return (centavos / 100).toLocaleString("pt-BR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function parseDisplayToCentavos(display: string): number {
  if (!display) return 0;
  // Remove tudo exceto dígitos, vírgula e ponto
  const cleaned = display.replace(/[^\d,.-]/g, "");
  // Converte formato brasileiro (1.234,56) para número
  const normalized = cleaned.replace(/\./g, "").replace(",", ".");
  const parsed = parseFloat(normalized);
  if (isNaN(parsed)) return 0;
  return Math.round(parsed * 100);
}

export function CurrencyInput({
  value,
  onChange,
  placeholder = "R$ 0,00",
  disabled = false,
  className,
}: CurrencyInputProps) {
  const [displayValue, setDisplayValue] = useState(() =>
    formatCentavosToDisplay(value)
  );
  const [isFocused, setIsFocused] = useState(false);

  const handleFocus = useCallback(() => {
    setIsFocused(true);
    // Mostra o valor sem formatação para facilitar edição
    if (value > 0) {
      setDisplayValue((value / 100).toFixed(2).replace(".", ","));
    } else {
      setDisplayValue("");
    }
  }, [value]);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
    const centavos = parseDisplayToCentavos(displayValue);
    onChange(centavos);
    setDisplayValue(formatCentavosToDisplay(centavos));
  }, [displayValue, onChange]);

  const handleChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const raw = e.target.value;
      setDisplayValue(raw);

      // Atualiza o valor em tempo real durante a digitação
      const centavos = parseDisplayToCentavos(raw);
      onChange(centavos);
    },
    [onChange]
  );

  return (
    <div className="relative">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
        R$
      </span>
      <Input
        type="text"
        inputMode="decimal"
        value={isFocused ? displayValue : formatCentavosToDisplay(value)}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn("pl-10", className)}
      />
    </div>
  );
}
