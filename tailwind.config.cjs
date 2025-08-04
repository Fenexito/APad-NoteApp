module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{jsx,js,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Source Sans Pro'", "ui-sans-serif", "system-ui"],
      },
      screens: {
        xs: "400px", // min‑width 400
        sm: "500px", // min‑width 500
        md: "600px", // min‑width 600
      },
    },
  },
  plugins: [],
};