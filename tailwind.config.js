// tailwind.config.js
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        dark: {
          background: '#0d0f14',
          card: '#1a1d24',
          text: '#ffffff',
          muted: '#94a3b8',
          border: '#2d3139',
          tint: '#f97316',
          success: '#10b981',
          warning: '#f59e0b',
          error: '#ef4444',
        }
      }
    },
  },
  plugins: [],
}
