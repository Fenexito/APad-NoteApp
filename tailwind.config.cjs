module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{jsx,js,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Source Sans Pro'", "ui-sans-serif", "system-ui"],
      },
      screens: {
        xs: "350px", // 3 → 4 cols
        md: "550px", // container cap
      },
    },
  },
  plugins: [],
};