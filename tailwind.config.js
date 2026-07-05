/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        cream: 'var(--color-cream)',
        sand: 'var(--color-sand)',
        clay: 'var(--color-clay)',
        sage: 'var(--color-sage)',
        sagedeep: 'var(--color-sagedeep)',
        ink: 'var(--color-ink)',
        muted: 'var(--color-muted)',
      },
      fontFamily: {
        display: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      keyframes: {
        breathe: {
          '0%,100%': { transform: 'scale(1)', opacity: '0.5' },
          '50%': { transform: 'scale(1.12)', opacity: '0.85' },
        },
        rise: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        breathe: 'breathe 6s ease-in-out infinite',
        rise: 'rise 0.5s ease both',
      },
    },
  },
  plugins: [],
}
