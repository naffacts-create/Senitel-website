import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ok: "#16a34a",
        warn: "#d97706",
        danger: "#dc2626",
      },
    },
  },
  plugins: [],
};

export default config;
