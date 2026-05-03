"use client";

import { useState, forwardRef } from "react";

interface FloatingLabelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  rightElement?: React.ReactNode;
  error?: boolean;
  success?: boolean;
}

export const FloatingLabelInput = forwardRef<HTMLInputElement, FloatingLabelInputProps>(
  ({ label, rightElement, error, success, onFocus, onBlur, value, ...props }, ref) => {
    const [focused, setFocused] = useState(false);
    const hasValue = value !== "" && value !== undefined && value !== null;
    const floated = focused || hasValue;

    const borderClass = error
      ? "border-red-500"
      : success
      ? "border-green-500"
      : focused
      ? "border-blue-500"
      : "border-slate-700";

    const labelColor = error
      ? "text-red-400"
      : success
      ? "text-green-400"
      : focused
      ? "text-blue-400"
      : "text-slate-400";

    return (
      <div className={`relative border-2 ${borderClass} rounded-xl bg-slate-950/50 transition-colors duration-200`}>
        <label
          className={`absolute left-4 pointer-events-none select-none transition-all duration-200 ${
            floated
              ? `top-2 text-xs font-medium ${labelColor}`
              : "top-1/2 -translate-y-1/2 text-base text-slate-400"
          }`}
        >
          {label}
        </label>
        <input
          ref={ref}
          value={value}
          {...props}
          placeholder=""
          onFocus={(e) => { setFocused(true); onFocus?.(e); }}
          onBlur={(e) => { setFocused(false); onBlur?.(e); }}
          className={`w-full px-4 pt-6 pb-2 bg-transparent text-white text-base focus:outline-none ${
            rightElement ? "pr-12" : ""
          }`}
        />
        {rightElement && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            {rightElement}
          </div>
        )}
      </div>
    );
  }
);

FloatingLabelInput.displayName = "FloatingLabelInput";
