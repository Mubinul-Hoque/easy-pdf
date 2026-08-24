'use client';

import React, { useRef, useEffect } from 'react';

interface OtpInputProps {
  value: string;
  onChange: (otp: string) => void;
  onComplete?: (otp: string) => void;
  disabled?: boolean;
  hasError?: boolean;
  autoFocus?: boolean;
}

export const OtpInput: React.FC<OtpInputProps> = ({
  value,
  onChange,
  onComplete,
  disabled = false,
  hasError = false,
  autoFocus = true,
}) => {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  // Array of 4 digits
  const digits = [
    value[0] || '',
    value[1] || '',
    value[2] || '',
    value[3] || '',
  ];

  useEffect(() => {
    if (autoFocus && inputsRef.current[0] && !disabled) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus, disabled]);

  const handleInputChange = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value.replace(/\D/g, '');

    // Handle multiple digits (e.g. browser autofill or paste)
    if (rawVal.length > 1) {
      const chars = rawVal.slice(0, 4).split('');
      const newDigits = [...digits];
      chars.forEach((c, i) => {
        if (index + i < 4) {
          newDigits[index + i] = c;
        }
      });
      const combined = newDigits.join('').slice(0, 4);
      onChange(combined);

      const nextFocus = Math.min(index + chars.length, 3);
      inputsRef.current[nextFocus]?.focus();

      if (combined.length === 4 && onComplete) {
        onComplete(combined);
      }
      return;
    }

    const lastChar = rawVal;
    const newDigits = [...digits];
    newDigits[index] = lastChar;
    const combined = newDigits.join('').slice(0, 4);

    onChange(combined);

    // Auto-advance to next input if digit entered
    if (lastChar && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }

    if (combined.length === 4 && onComplete) {
      onComplete(combined);
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        // Move back and clear previous
        inputsRef.current[index - 1]?.focus();
        const newDigits = [...digits];
        newDigits[index - 1] = '';
        onChange(newDigits.join(''));
      } else {
        const newDigits = [...digits];
        newDigits[index] = '';
        onChange(newDigits.join(''));
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputsRef.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 3) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim().replace(/\D/g, '').slice(0, 4);

    if (pastedData) {
      onChange(pastedData);
      const focusIndex = Math.min(pastedData.length, 3);
      inputsRef.current[focusIndex]?.focus();

      if (pastedData.length === 4 && onComplete) {
        onComplete(pastedData);
      }
    }
  };

  return (
    <div className="flex items-center justify-center gap-3 sm:gap-4 my-3">
      {[0, 1, 2, 3].map((index) => {
        const isFilled = !!digits[index];
        return (
          <div key={index} className="relative">
            <input
              ref={(el) => {
                inputsRef.current[index] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={4}
              autoComplete={index === 0 ? 'one-time-code' : 'off'}
              disabled={disabled}
              value={digits[index]}
              onChange={(e) => handleInputChange(index, e)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              onFocus={(e) => e.target.select()}
              aria-label={`Digit ${index + 1} of 4`}
              className={`h-14 w-12 sm:h-16 sm:w-14 rounded-xl text-center font-mono text-2xl font-bold transition-all duration-200 outline-none cursor-pointer
                ${
                  hasError
                    ? 'border-2 border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-4 focus:ring-rose-500/20'
                    : isFilled
                    ? 'border-2 border-indigo-600 bg-indigo-50/30 text-indigo-950 shadow-sm shadow-indigo-500/10 focus:ring-4 focus:ring-indigo-500/20'
                    : 'border-2 border-slate-200 bg-white text-slate-900 hover:border-slate-300 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-500/20'
                }
                ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100' : ''}
              `}
            />
            <div
              className={`absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-4 rounded-full transition-all duration-200 ${
                isFilled ? 'bg-indigo-600 w-6' : 'bg-transparent'
              }`}
            />
          </div>
        );
      })}
    </div>
  );
};

export default OtpInput;
