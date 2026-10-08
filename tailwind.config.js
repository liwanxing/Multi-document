/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        volc: {
          blue: "#1664FF",
          hover: "#3882FF",
          bg: "#F7F8FA",
          border: "#E5E6EB",
          text: "#1D2129",
          secondary: "#4E5969",
          muted: "#86909C",
          tag: "#F2F3F5",
        },
      },
    },
  },
  plugins: [],
};
