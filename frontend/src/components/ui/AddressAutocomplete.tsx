import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { cn } from "@/lib/cn";

export interface AddressSuggestion {
  id: string;
  label: string;
  postcode?: string;
  city?: string;
}

interface AddressApiFeature {
  properties: {
    id?: string;
    label: string;
    postcode?: string;
    city?: string;
  };
}

interface AddressApiResponse {
  features?: AddressApiFeature[];
}

export interface AddressAutocompleteProps {
  id?: string;
  name?: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  "data-cy"?: string;
  autoComplete?: string;
  "aria-label"?: string;
}

const API_URL = "https://api-adresse.data.gouv.fr/search/";
const DEBOUNCE_MS = 300;

/**
 * Accessible address autocomplete querying api-adresse.data.gouv.fr
 * with 300ms debounce, combobox semantics, and freeform typing fallback.
 */
export function AddressAutocomplete({
  id,
  name,
  value,
  onChange,
  onBlur,
  placeholder,
  disabled,
  className,
  "data-cy": dataCy,
  autoComplete = "off",
  "aria-label": ariaLabel,
}: AddressAutocompleteProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const listboxId = `${inputId}-listbox`;

  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const containerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const blurredRef = useRef(false);

  const fetchSuggestions = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (trimmed.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const url = `${API_URL}?q=${encodeURIComponent(trimmed)}&limit=5`;
      const res = await fetch(url, { signal: controller.signal });
      if (!res.ok) {
        throw new Error(`HTTP error ${res.status}`);
      }
      const data = (await res.json()) as AddressApiResponse;
      // A response landing after the user left the field must never reopen the
      // list over another control.
      if (blurredRef.current) {
        return;
      }
      const list: AddressSuggestion[] = (data.features ?? []).map((f, idx) => ({
        id: f.properties.id || `${f.properties.label}-${idx}`,
        label: f.properties.label,
        postcode: f.properties.postcode,
        city: f.properties.city,
      }));
      setSuggestions(list);
      setIsOpen(list.length > 0);
      setActiveIndex(-1);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        setSuggestions([]);
        setIsOpen(false);
      }
    }
  }, []);

  const handleInputChange = (newValue: string) => {
    onChange(newValue);
    setActiveIndex(-1);
  };

  useEffect(() => {
    if (!value || value.trim().length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(() => {
      void fetchSuggestions(value);
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [value, fetchSuggestions]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const handleSelect = (address: string) => {
    onChange(address);
    setIsOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev < suggestions.length - 1 ? prev + 1 : 0,
        );
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) =>
          prev > 0 ? prev - 1 : suggestions.length - 1,
        );
        break;
      case "Enter":
        if (activeIndex >= 0 && suggestions[activeIndex]) {
          e.preventDefault();
          handleSelect(suggestions[activeIndex].label);
        }
        break;
      case "Escape":
        e.preventDefault();
        setIsOpen(false);
        setActiveIndex(-1);
        break;
    }
  };

  const handleBlur = () => {
    blurredRef.current = true;
    abortControllerRef.current?.abort();
    // Delay closing slightly so clicking an option isn't cancelled
    setTimeout(() => {
      setIsOpen(false);
      setActiveIndex(-1);
      onBlur?.();
    }, 150);
  };

  const activeOptionId =
    isOpen && activeIndex >= 0 ? `${listboxId}-opt-${activeIndex}` : undefined;

  return (
    <div ref={containerRef} className="relative w-full">
      <input
        id={inputId}
        name={name}
        type="text"
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={isOpen && suggestions.length > 0}
        aria-controls={listboxId}
        aria-activedescendant={activeOptionId}
        aria-label={ariaLabel}
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => handleInputChange(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => {
          blurredRef.current = false;
          if (suggestions.length > 0) setIsOpen(true);
        }}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        data-cy={dataCy}
        className={cn("field", className)}
      />

      {isOpen && suggestions.length > 0 ? (
        <ul
          id={listboxId}
          role="listbox"
          className="absolute z-50 mt-1 max-h-60 w-full overflow-auto rounded-md border border-line bg-surface p-1 shadow-lg"
        >
          {suggestions.map((suggestion, index) => {
            const isSelected = activeIndex === index;
            return (
              <li
                key={suggestion.id}
                id={`${listboxId}-opt-${index}`}
                role="option"
                aria-selected={isSelected}
                onMouseDown={(e) => {
                  e.preventDefault();
                  handleSelect(suggestion.label);
                }}
                className={cn(
                  "cursor-pointer rounded-sm px-3 py-2 text-sm text-ink transition hover:bg-paper-deep",
                  isSelected && "bg-accent-soft font-medium text-accent",
                )}
              >
                {suggestion.label}
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
