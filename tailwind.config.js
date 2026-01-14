/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    50: '#fef2f2',
                    100: '#fee2e2',
                    200: '#fecaca',
                    300: '#fca5a5',
                    400: '#f87171',
                    500: '#ef4444',
                    600: '#D62300', // BK Flame Red
                    700: '#b91c1c',
                    800: '#991b1b',
                    900: '#7f1d1d',
                    950: '#450a0a',
                },
                royal: {
                    red: '#D62300',
                    orange: '#F5AF18',
                    brown: '#502D16',
                    cream: '#F5EBDD',
                    glass: 'rgba(255, 255, 255, 0.03)',
                    'glass-dark': 'rgba(0, 0, 0, 0.4)',
                },
                foodgo: {
                    red: '#D62300', // Matching the design's specific red
                    gray: '#F5F5F5', // Light background
                }
            },
            fontFamily: {
                sans: ['Inter', 'sans-serif'],
                lobster: ['Lobster', 'cursive'],
            },
            borderRadius: {
                'premium': '1.25rem',
                'ios': '2.5rem',
                'giant': '4rem',
            },
            boxShadow: {
                'premium': '0 8px 32px 0 rgba(0, 0, 0, 0.37)',
                'glass': '0 8px 32px 0 rgba(0, 0, 0, 0.5)',
                'royal': '0 20px 50px -12px rgba(214, 35, 0, 0.3)',
                'card': '0 10px 40px -10px rgba(0,0,0,0.08)',
            }
        },
    },
    plugins: [],
}
