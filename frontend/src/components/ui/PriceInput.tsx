'use client';

import { useState, useEffect } from 'react';

interface PriceInputProps {
  value: number;
  onChange: (value: number) => void;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
}

/**
 * A price input that uses a local string buffer to avoid the
 * `parseFloat(e.target.value) || 0` problem with type="number".
 * This allows typing intermediate values like "10", "10.", "10.5" without
 * the cursor jumping or zeros being swallowed.
 */
export default function PriceInput({ value, onChange, className, placeholder = '0.00', disabled }: PriceInputProps) {
  const [localValue, setLocalValue] = useState<string>(value ? String(value) : '');

  // Sync from parent only when the numeric value actually changes externally
  useEffect(() => {
    setLocalValue((prev) => {
      const parsed = parseFloat(prev);
      // If local state already represents the same number, keep the string as-is
      if (!isNaN(parsed) && parsed === value) return prev;
      // If both are 0/empty, keep local as-is to not overwrite user typing
      if ((isNaN(parsed) || prev === '') && value === 0) return prev;
      return value ? String(value) : '';
    });
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value;
    // Allow empty, or valid decimal number pattern
    if (raw === '' || /^\d*\.?\d*$/.test(raw)) {
      setLocalValue(raw);
      const num = parseFloat(raw);
      onChange(isNaN(num) ? 0 : num);
    }
  };

  const handleBlur = () => {
    // On blur, normalize the display (remove trailing dots, format properly)
    if (localValue === '' || localValue === '.') {
      setLocalValue('');
      onChange(0);
    } else {
      const num = parseFloat(localValue);
      if (!isNaN(num)) {
        setLocalValue(String(num));
        onChange(num);
      }
    }
  };

  return (
    <input
      type="text"
      inputMode="decimal"
      value={localValue}
      onChange={handleChange}
      onBlur={handleBlur}
      placeholder={placeholder}
      disabled={disabled}
      className={className}
    />
  );
}
