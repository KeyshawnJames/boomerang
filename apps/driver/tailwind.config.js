const themed = (name) => `rgb(var(--color-${name}) / <alpha-value>)`;

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Switch with light/dark mode (src/global.css).
        bg: themed("bg"),
        surface: themed("surface"),
        ink: themed("ink"),
        muted: themed("muted"),
        line: themed("line"),
        primary: themed("primary"),
        "on-primary": themed("on-primary"),
        // Fixed brand colors from the prototype.
        forest: "#0B3D2E",
        emerald: "#0F9D63",
        mint: { DEFAULT: "#34D399", soft: "#E3F7EE", tint: "#F1FBF6" },
        amber: "#E8A33D",
        danger: "#E5544B",
      },
      // Native fonts have one family per weight, so weight lives in the family name.
      fontFamily: {
        sans: ["Manrope_400Regular"],
        "sans-semibold": ["Manrope_600SemiBold"],
        "sans-bold": ["Manrope_700Bold"],
        "sans-extrabold": ["Manrope_800ExtraBold"],
      },
      borderRadius: { sm: "14px", md: "20px", lg: "28px" },
    },
  },
  plugins: [],
};
