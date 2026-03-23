/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0f172a",
        breeze: "#ecfeff",
        accent: "#0ea5e9",
      },
      fontFamily: {
        sans: ["Manrope", "ui-sans-serif", "system-ui"],
        display: ["Space Grotesk", "ui-sans-serif", "system-ui"],
      },
      backgroundImage: {
        grain:
          "radial-gradient(circle at 20% 20%, rgba(14,165,233,0.16), transparent 30%), radial-gradient(circle at 80% 0%, rgba(22,163,74,0.15), transparent 20%)",
      },
    },
  },
  plugins: [],
};
