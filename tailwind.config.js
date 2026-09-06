/** @type {import('tailwindcss').Config} */
module.exports = {
  safelist: [
    { pattern: /^(btn|btn-primary|btn-outline|alert|alert-warning|alert-error|alert-success|steps|step|step-primary|navbar|badge|loading|divider|table|input|select|checkbox)$/ },
  ],
  content: ['./src/**/*.{js,jsx,ts,tsx,html}'],
  theme: {
    extend: {},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['corporate', 'business'],
    darkTheme: 'business', // uses this theme when prefers-color-scheme: dark
  },
};
