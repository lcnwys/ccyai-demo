import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#14231d",
        mist: "#f6f1e8",
        clay: "#d46c31",
        forest: "#21493d",
        moss: "#dce7df",
        line: "rgba(20,35,29,0.12)",
        noir: "#0a0a0b",
        obsidian: "#121212",
        gold: "#d6b25e",
        champagne: "#f4e7b2",
        bronze: "#b07a33"
      },
      boxShadow: {
        soft: "0 20px 60px rgba(20,35,29,0.08)",
        luxe: "0 20px 60px rgba(0,0,0,0.45)"
      },
      backgroundImage: {
        "hero-wash":
          "radial-gradient(circle at top left, rgba(212,108,49,0.18), transparent 28%), radial-gradient(circle at 80% 10%, rgba(33,73,61,0.12), transparent 32%), linear-gradient(180deg, #faf5ee 0%, #edf2ec 100%)",
        "luxe-noise":
          "radial-gradient(circle at top, rgba(214,178,94,0.16), transparent 18%), radial-gradient(circle at 85% 12%, rgba(214,178,94,0.1), transparent 14%), linear-gradient(180deg, #0b0b0c 0%, #0f0f10 44%, #0b0b0c 100%)"
      }
    }
  },
  plugins: []
};

export default config;
