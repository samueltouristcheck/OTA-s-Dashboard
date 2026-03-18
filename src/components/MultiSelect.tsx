"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check } from "lucide-react";

type Props = {
  options: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  placeholder?: string;
  label?: (value: string) => string;
  className?: string;
};

export function MultiSelect({
  options,
  selected,
  onChange,
  placeholder = "Seleccionar...",
  label = (v) => v,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function toggle(opt: string, e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (selected.includes(opt)) {
      onChange(selected.filter((x) => x !== opt));
    } else {
      onChange([...selected, opt]);
    }
  }

  const displayText = selected.length === 0
    ? placeholder
    : selected.length > 1
      ? "Selección múltiple"
      : label(selected[0]);

  return (
    <div ref={ref} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 h-9 min-w-[140px] px-3 border border-slate-200 rounded-lg text-sm bg-white hover:bg-slate-50 text-left"
      >
        <span className="truncate text-slate-700">{displayText}</span>
        <ChevronDown className={`w-4 h-4 text-slate-500 shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div className="absolute z-50 mt-1 w-full max-h-60 overflow-y-auto bg-white border border-slate-200 rounded-lg shadow-lg py-1">
          <p className="px-3 py-1.5 text-xs text-slate-500 border-b border-slate-100">Clic para marcar/desmarcar (varios)</p>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={(e) => toggle(opt, e)}
              onMouseDown={(e) => e.preventDefault()}
              className={`flex items-center gap-2 w-full px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                selected.includes(opt) ? "bg-blue-50 text-blue-800" : "text-slate-700"
              }`}
            >
              {selected.includes(opt) ? (
                <Check className="w-4 h-4 shrink-0 text-blue-600" />
              ) : (
                <span className="w-4" />
              )}
              {label(opt)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
