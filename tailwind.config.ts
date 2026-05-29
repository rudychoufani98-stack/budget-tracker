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
        bg:     "#1A1F35",
        card:   "#222A42",
        card2:  "#2A3354",
        bdr:    "#323D5E",
        bdr2:   "#404F74",
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
