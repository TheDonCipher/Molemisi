import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        molemisi: {
          earth: '#C05C3C',
          brown: '#8B5E3C',
          sand: '#E8D5A3',
          grass: '#5A8F3C',
          sky: '#87CEEB',
          sunset: '#E8945A',
          night: '#2C1810',
          panel: '#3E2723',
          border: '#5D4037',
          text: '#F5E6D3',
          muted: '#BCAAA4',
          accent: '#FF8F00',
        },
      },
    },
  },
  plugins: [],
};

export default config;
