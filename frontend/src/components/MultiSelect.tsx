import { useState, useRef, useEffect } from "react";

export default function MultiSelect({
  label,
  options,
  selected,
  onChange,
  required,
}: {
  label: string;
  options: readonly string[];
  selected: string[];
  onChange: (values: string[]) => void;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const toggle = (value: string) => {
    if (selected.includes(value)) {
      onChange(selected.filter((v) => v !== value));
    } else {
      onChange([...selected, value]);
    }
  };

  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </span>
      <div className="mt-1 relative" ref={ref}>
        <div
          className="input cursor-pointer min-h-[38px] flex flex-wrap gap-1 items-center"
          onClick={() => setOpen(!open)}
        >
          {selected.length === 0 ? (
            <span className="text-gray-400 text-sm">Select...</span>
          ) : (
            selected.map((v) => (
              <span
                key={v}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded"
              >
                {v}
                <button
                  type="button"
                  className="text-blue-600 hover:text-blue-900 font-bold"
                  onClick={(e) => {
                    e.stopPropagation();
                    toggle(v);
                  }}
                >
                  x
                </button>
              </span>
            ))
          )}
        </div>
        {open && (
          <div className="absolute z-10 mt-1 w-full bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
            {options.map((opt) => (
              <label
                key={opt}
                className="flex items-center px-3 py-2 hover:bg-gray-50 cursor-pointer text-sm"
              >
                <input
                  type="checkbox"
                  checked={selected.includes(opt)}
                  onChange={() => toggle(opt)}
                  className="mr-2"
                />
                {opt}
              </label>
            ))}
          </div>
        )}
      </div>
    </label>
  );
}
