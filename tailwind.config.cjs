const path = require("path")

// get the path of the dependency "@medusajs/ui"
const medusaUI = path.join(
  path.dirname(require.resolve("@medusajs/ui")),
  "**/*.{js,jsx,ts,tsx}"
)

/** @type {import('tailwindcss').Config} */
module.exports = {
  presets: [require("@medusajs/ui-preset")],
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}", medusaUI],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        co: {
          navy: "#17294A",
          "navy-light": "#1E3560",
          gold: "#F2CD69",
          "gold-dark": "#D4A017",
          champagne: "#DECF8F",
          cream: "#FAF9F5",
          surface: "#FFFFFF",
          text: "#14140F",
          "text-secondary": "#616161",
          "text-on-dark": "#FAF9F5",
          success: "#3D7A4A",
          warning: "#D4A017",
          error: "#B33A3A",
        },
      },
      fontFamily: {
        sans: ["Poppins", "Inter", "ui-sans-serif", "system-ui", "sans-serif"],
        cinzel: ["Cinzel", "EB Garamond", "serif"],
        garamond: ["EB Garamond", "serif"],
        poppins: ["Poppins", "sans-serif"],
      },
      backgroundImage: {
        "damask-pattern":
          "url(\"data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 5c2 4 6 8 12 10-6 2-10 6-12 10-2-4-6-8-12-10 6-2 10-6 12-10zm0 20c1 3 4 5 8 7-4 2-7 4-8 7-1-3-4-5-8-7 4-2 7-4 8-7z' fill='%2317294A' fill-opacity='0.04' fill-rule='evenodd'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [],
}
