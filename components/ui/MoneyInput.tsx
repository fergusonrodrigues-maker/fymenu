"use client";

import React, { useEffect, useState } from "react";
import { formatCentsBare, parseToCents } from "@/lib/money";

type Props = {
  /** Value in cents. */
  value: number;
  /** Called with the new cent value on every change. */
  onChange: (cents: number) => void;
  placeholder?: string;
  disabled?: boolean;
  /** Forwarded to the underlying <input>. */
  className?: string;
  /** Inline style forwarded to the underlying <input>. */
  style?: React.CSSProperties;
  /** Style for the wrapping <div>. */
  wrapperStyle?: React.CSSProperties;
  /** Defaults to "R$ "; pass empty string to hide the prefix. */
  prefix?: string;
  id?: string;
  name?: string;
  autoFocus?: boolean;
  inputRef?: React.Ref<HTMLInputElement>;
};

/**
 * Card-machine-style money input. The user just types digits and the value
 * scrolls in from the right (1 → 0,01; 12 → 0,12; 1234 → 12,34). The parent
 * always receives integer cents, so persisting and summing is trivial.
 */
export function MoneyInput({
  value,
  onChange,
  placeholder = "R$ 0,00",
  disabled,
  className,
  style,
  wrapperStyle,
  prefix = "R$ ",
  id,
  name,
  autoFocus,
  inputRef,
}: Props) {
  const [display, setDisplay] = useState(value > 0 ? formatCentsBare(value) : "");

  useEffect(() => {
    setDisplay(value > 0 ? formatCentsBare(value) : "");
  }, [value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const cents = parseToCents(e.target.value);
    setDisplay(cents > 0 ? formatCentsBare(cents) : "");
    onChange(cents);
  }

  const inputStyle: React.CSSProperties = {
    paddingLeft: prefix ? 38 : undefined,
    ...style,
  };

  return (
    <div style={{ position: "relative", ...wrapperStyle }}>
      {prefix && (
        <span
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: "#888",
            pointerEvents: "none",
            fontSize: "inherit",
          }}
        >
          {prefix}
        </span>
      )}
      <input
        id={id}
        name={name}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={display}
        onChange={handleChange}
        disabled={disabled}
        placeholder={placeholder}
        autoFocus={autoFocus}
        ref={inputRef}
        className={className}
        style={inputStyle}
      />
    </div>
  );
}
