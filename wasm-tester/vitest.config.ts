import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config.ts'

export default mergeConfig(viteConfig, defineConfig({
    test: {
        reporters: ['verbose'],
        setupFiles: ['@vitest/web-worker'],
        typecheck: {
            enabled: true,
            include: ['src/**/*.ts', 'definitions', 'test/**/*.ts'],
            tsconfig: 'tsconfig.app.json'
        },
        dir: 'test',
      },
}))