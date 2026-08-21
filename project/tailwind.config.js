/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{js,ts,jsx,tsx,mdx}",
		"./components/**/*.{js,ts,jsx,tsx,mdx}",
		"./app/**/*.{js,ts,jsx,tsx,mdx}",
		"*.{js,ts,jsx,tsx,mdx}",
	],
	theme: {
		extend: {
			colors: {
				border: "hsl(var(--border))",
				input: "hsl(var(--input))",
				ring: "hsl(var(--ring))",
				background: "hsl(var(--background))",
				foreground: "hsl(var(--foreground))",
				primary: {
					DEFAULT: "hsl(var(--primary))",
					foreground: "hsl(var(--primary-foreground))",
				},
				secondary: {
					DEFAULT: "hsl(var(--secondary))",
					foreground: "hsl(var(--secondary-foreground))",
				},
				destructive: {
					DEFAULT: "hsl(var(--destructive))",
					foreground: "hsl(var(--destructive-foreground))",
				},
				muted: {
					DEFAULT: "hsl(var(--muted))",
					foreground: "hsl(var(--muted-foreground))",
				},
				accent: {
					DEFAULT: "hsl(var(--accent))",
					foreground: "hsl(var(--accent-foreground))",
				},
				popover: {
					DEFAULT: "hsl(var(--popover))",
					foreground: "hsl(var(--popover-foreground))",
				},
				card: {
					DEFAULT: "hsl(var(--card))",
					foreground: "hsl(var(--card-foreground))",
				},
				// Centralized brand color palette #05162b, #079697, #25cfb4
				brand: {
					navy: "#05162b",
					teal: "#079697",
					mint: "#25cfb4",
				},
				brand_navy: {
					DEFAULT: "#05162b",
					50: "#e7ebf1",
					100: "#c7d2e0",
					200: "#98acc6",
					300: "#6582a8",
					400: "#3d5f8c",
					500: "#05162b",
					600: "#041223",
					700: "#030e1c",
					800: "#020a14",
					900: "#01050b",
				},
				brand_teal: {
					DEFAULT: "#079697",
					50: "#eef9f9",
					100: "#d4f2f2",
					200: "#aee6e6",
					300: "#79d4d5",
					400: "#3ebdbe",
					500: "#079697",
					600: "#067f80",
					700: "#056768",
					800: "#045051",
					900: "#03393a",
				},
				brand_mint: {
					DEFAULT: "#25cfb4",
					50: "#eefcf9",
					100: "#d3f7f0",
					200: "#aaf0e3",
					300: "#73e5d1",
					400: "#3cd5be",
					500: "#25cfb4",
					600: "#1da892",
					700: "#198675",
					800: "#16695d",
					900: "#134e45",
				},
			},
			fontFamily: {
				sans: ["Inter", "sans-serif"],
			},
			borderRadius: {
				lg: "var(--radius)",
				md: "calc(var(--radius) - 2px)",
				sm: "calc(var(--radius) - 4px)",
			},
		},
	},
	plugins: [require("tailwindcss-animate")],
};
