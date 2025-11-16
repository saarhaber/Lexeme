/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: '#3A70FF',    // Soft blue
        secondary: '#FFD86A',  // Warm yellow
        background: '#F8F8F8', // Off-white
      },
      fontFamily: {
        'heading': ['Inter', 'sans-serif'],
        'body': ['Source Sans Pro', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
