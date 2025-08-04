module.exports = {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{jsx,js,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Source Sans Pro'", "ui-sans-serif", "system-ui"],
      },
      screens: {
        xs: "350px",
        md: "550px",
      },
    },
  },
  plugins: [],
};