/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Adblume / peec.ai-inspired palette
        ink: "#171512",
        muted: "#706b61",
        line: "#ddd7cb",
        "soft-line": "#eee8dc",
        paper: "#fbfaf6",
        panel: "#ffffff",
        pearl: "#f2eee6",
        sage: "#496b5a",
        "sage-soft": "#e5ede7",
        amber: "#b46d32",
        "amber-soft": "#f4e3d4",
        graphite: "#2f3432",
        red: "#9c3f35",
        "red-soft": "#f4dddd",
        // legacy
        navy: "#0F172A",
        teal: "#0D9488",
      },
      boxShadow: {
        paper: "0 16px 44px rgba(28, 25, 18, 0.08)",
      },
    },
  },
  plugins: [],
};
