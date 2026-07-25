/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./src/**/*.{js,ts,jsx,tsx,mdx}",
    ],
    theme: {
        extend: {
            colors: {
                gold: "#F7C948",
                "sea-blue": "#2196F3",
                "sunset-orange": "#FF9800",
                wood: "#8D6E63",
                "reef-teal": "#00897B",
                "marine-white": "#FAFAFA",
                abyssal: "#0D1B2A",
                navy: "#1B2838",
                "bounty-red": "#D32F2F",
                parchment: "#F4E4BC",
                "kelp-green": "#2E7D32",
                cunning: "#4F46E5",
                whispers: "#DC2626",
                navigation: "#059669",
                brews: "#D97706",
            },
            animation: {
                float: "float 3s ease-in-out infinite",
                "pulse-glow": "pulse-glow 2s ease-in-out infinite",
                "bounce-in": "bounce-in 0.5s ease-out",
                "slide-up": "slide-up 0.3s ease-out",
            },
            keyframes: {
                float: {
                    "0%, 100%": { transform: "translateY(0)" },
                    "50%": { transform: "translateY(-8px)" },
                },
                "pulse-glow": {
                    "0%, 100%": { boxShadow: "0 0 5px rgba(99, 102, 241, 0.4)" },
                    "50%": { boxShadow: "0 0 20px rgba(99, 102, 241, 0.8)" },
                },
                "bounce-in": {
                    "0%": { transform: "scale(0)", opacity: "0" },
                    "60%": { transform: "scale(1.15)" },
                    "100%": { transform: "scale(1)", opacity: "1" },
                },
                "slide-up": {
                    from: { transform: "translateY(20px)", opacity: "0" },
                    to: { transform: "translateY(0)", opacity: "1" },
                },
            },
        },
    },
    plugins: [],
};
