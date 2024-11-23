import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ["**/*.d3b", "**/*.xml", "../submodules/das2C/schema/das-basic-stream-v3.0.xsd"],

})
