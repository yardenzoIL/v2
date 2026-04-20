import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/postcss'

export default defineConfig({
  base: './',
  plugins: [
    tailwindcss(),
  ],
})