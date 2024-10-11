import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  assetsInclude: ["./test/data/2023-08-27_2024-08-14_bin-60s.d3b", "../submodules/das2C/schema/das-basic-stream-v3.0.xsd"],

})
