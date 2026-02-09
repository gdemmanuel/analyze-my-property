/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'primary': '#1E3A8A',    // Navy blue
        'accent': '#14B8A6',     // Teal
        'success': '#10B981',    // Green
        'warning': '#F59E0B',    // Amber
        'error': '#EF4444',      // Red
      },
      fontFamily: {
        'sans': ['Inter', 'Open Sans', 'system-ui'],
      },
    },
  },
  plugins: [],
  // Development optimization
  safelist: [
    // Add any dynamic classes here if needed
  ],
}
