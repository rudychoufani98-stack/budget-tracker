import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        bg:     "#0A0F1E",
        card:   "#111827",
        card2:  "#1A2235",
        bdr:    "#1F2937",
        bdr2:   "#374151",
        egreen: "#10B981",
        eamber: "#F59E0B",
        ered:   "#EF4444",
        eblue:  "#3B82F6",
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
export default config;
