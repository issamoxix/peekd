import type { TextareaHTMLAttributes } from "react";

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  hint?: string;
}

export function Textarea({ label, error, hint, className = "", ...props }: TextareaProps) {
  return (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="text-sm text-gray-500 mb-1">{hint}</p>}
      <textarea
        className={`w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-teal ${
          error ? "border-red-500" : "border-gray-300"
        } ${className}`}
        rows={4}
        {...props}
      />
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
