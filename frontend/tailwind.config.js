/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        primary: "#B5651D",
        secondary: "#8A7659",
        background: "#F4ECD8",
        surface: "#FBF5E6",
        text: "#4A3B28",
        highlight: "rgba(181, 101, 29, 0.27)",
        "icon-purple": "#2A1E5C",
        "icon-purple-dark": "#0C0826",
        gold: "#FFD15C",
      },
      fontFamily: {
        heading: ["Georgia", "Times New Roman", "serif"],
        body: ["Helvetica Neue", "Helvetica", "Arial", "sans-serif"],
      },
      screens: {
        xs: "360px",
        phone: "480px",
        "3xl": "1600px",
      },
      maxWidth: {
        "screen-phone": "420px",
        "screen-tablet": "768px",
        "content-narrow": "960px",
      },
      spacing: {
        "safe-t": "env(safe-area-inset-top, 0px)",
        "safe-b": "env(safe-area-inset-bottom, 0px)",
      },
      boxShadow: {
        floating: "0 20px 45px rgba(74, 59, 40, 0.12)",
        "soft-card": "0 8px 24px rgba(74, 59, 40, 0.08)",
        inset: "inset 0 1px 0 rgba(255, 255, 255, 0.45)",
      },
      letterSpacing: {
        "small-caps": "0.14em",
      },
      borderRadius: {
        "3xl": "1.75rem",
      },
    },
  },
  plugins: [],
};
