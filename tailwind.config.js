/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Palet terinspirasi dari kebun & minyak sawit:
        // hijau perkebunan sebagai warna utama, emas minyak sawit sebagai aksen
        plantation: {
          950: '#0F241B',
          900: '#16302A',
          800: '#1E3F36',
          700: '#2A5245',
          600: '#3A6B58',
        },
        gold: {
          400: '#E3B155',
          500: '#C98A2E',
          600: '#A96F22',
        },
        paper: {
          50: '#FBF8F2',
          100: '#F5EFE3',
          200: '#EAE1CE',
        },
        ink: {
          900: '#1F2A24',
          700: '#3D4A42',
          500: '#6B7A70',
        },
      },
      fontFamily: {
        display: ['"Fraunces"', 'serif'],
        sans: ['"Inter"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 1px 2px rgba(15, 36, 27, 0.06), 0 4px 16px rgba(15, 36, 27, 0.06)',
      },
      opacity: {
        6: '0.06',
        8: '0.08',
        15: '0.15',
        45: '0.45',
      },
    },
  },
  plugins: [],
}
