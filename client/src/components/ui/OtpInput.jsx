import { useEffect, useRef } from "react";

const INPUT_CLASSES =
  "w-11 h-12 text-center text-lg font-mono rounded-lg border border-border-light dark:border-border-dark bg-bg-light dark:bg-bg-dark text-text-primary-light dark:text-text-primary-dark placeholder:text-text-muted-light dark:placeholder:text-text-muted-dark focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 transition-colors";

export default function OtpInput({ value = "", length = 6, onChange, disabled = false }) {
  const inputsRef = useRef([]);

  const chars = Array.from({ length }, (_, i) => value[i] ?? "");

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  function writeChars(startIndex, raw) {
    const next = Array.from({ length }, (_, i) => value[i] ?? "");
    for (let i = 0; i < raw.length && startIndex + i < length; i++) {
      next[startIndex + i] = raw[i];
    }
    onChange(next.join(""));
    return Math.min(startIndex + raw.length, length - 1);
  }

  function handleChange(index, e) {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    const nextIndex = writeChars(index, raw);
    inputsRef.current[nextIndex]?.focus();
  }

  function handlePaste(index, e) {
    e.preventDefault();
    const raw = e.clipboardData.getData("text").replace(/\D/g, "");
    if (!raw) return;
    const nextIndex = writeChars(index, raw);
    inputsRef.current[nextIndex]?.focus();
  }

  function handleKeyDown(index, e) {
    if (e.key === "Backspace") {
      if (chars[index] === "" && index > 0) {
        e.preventDefault();
        inputsRef.current[index - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      inputsRef.current[Math.max(0, index - 1)]?.focus();
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      inputsRef.current[Math.min(length - 1, index + 1)]?.focus();
    }
  }

  return (
    <div className="flex items-center justify-center gap-2" dir="ltr">
      {chars.map((char, index) => (
        <input
          key={index}
          ref={(el) => {
            inputsRef.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={char}
          disabled={disabled}
          aria-label={`Digit ${index + 1} of ${length}`}
          onChange={(e) => handleChange(index, e)}
          onKeyDown={(e) => handleKeyDown(index, e)}
          onPaste={(e) => handlePaste(index, e)}
          className={INPUT_CLASSES}
        />
      ))}
    </div>
  );
}
