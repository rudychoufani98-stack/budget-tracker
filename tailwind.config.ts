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
        bg:     "#F8FAFC",
        card:   "#FFFFFF",
        card2:  "#F1F5F9",
        bdr:    "#E2E8F0",
        bdr2:   "#CBD5E1",
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
