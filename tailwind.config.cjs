module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{jsx,js,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Source Sans Pro'", "ui-sans-serif", "system-ui"],
      },
      screens: {
        xs: "350px", // min‑width 350
        sm: "450px", // min‑width 450
        md: "550px", // min‑width 550
      },
    },
  },
  plugins: [],
};