/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}", "./public/index.html"],
  theme: {
    extend: {
      colors: {
        primary: "#3A70FF", // Soft blue
        secondary: "#FFD86A", // Warm yellow
        background: "#F8F8F8", // Off-white
      },
      fontFamily: {
        heading: ["Inter", "sans-serif"],
        body: ["Source Sans Pro", "sans-serif"],
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
        floating: "0 20px 45px rgba(15, 23, 42, 0.12)",
        "soft-card": "0 8px 24px rgba(15, 23, 42, 0.08)",
      },
      borderRadius: {
        "3xl": "1.75rem",
      },
    },
  },
  plugins: [],
};
