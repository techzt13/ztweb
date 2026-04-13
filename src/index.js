import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import prompts from 'prompts'
import minimist from 'minimist'
import { red, green, bold, cyan } from 'kolorist'
import Handlebars from 'handlebars'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Register Handlebars helper for equality checks
Handlebars.registerHelper('eq', (a, b) => a === b)

async function init() {
  const argv = minimist(process.argv.slice(2))

  let projectName = argv._[0]

  const onCancel = () => {
    console.log(red('✖') + ' Operation cancelled')
    process.exit(1)
  }

  // If no project name provided, ask interactively
  if (!projectName) {
    const result = await prompts(
      {
        type: 'text',
        name: 'projectName',
        message: 'Project name:',
        initial: 'ztweb-project',
      },
      { onCancel }
    )
    projectName = result.projectName
  }

  // Validate project name
  if (!projectName || !isValidPackageName(projectName)) {
    console.error(red('✖') + ' Invalid project name')
    process.exit(1)
  }

  const targetDir = path.resolve(process.cwd(), projectName)

  // Check if directory exists and handle confirmation
  if (fs.existsSync(targetDir)) {
    const files = fs.readdirSync(targetDir)
    if (files.length > 0) {
      const result = await prompts(
        {
          type: 'confirm',
          name: 'overwrite',
          message: `Directory ${cyan(projectName)} already exists and is not empty. Continue?`,
          initial: false,
        },
        { onCancel }
      )

      if (!result.overwrite) {
        console.log(red('✖') + ' Operation cancelled')
        process.exit(1)
      }
    }
  }

  // Ask for optional features
  const features = await prompts(
    [
      {
        type: 'toggle',
        name: 'useTypeScript',
        message: 'Add TypeScript?',
        initial: false,
        active: 'Yes',
        inactive: 'No',
      },
      {
        type: 'toggle',
        name: 'useJsx',
        message: 'Add JSX Support?',
        initial: false,
        active: 'Yes',
        inactive: 'No',
      },
      {
        type: 'toggle',
        name: 'useRouter',
        message: 'Add ztweb Router for Single Page Application development?',
        initial: false,
        active: 'Yes',
        inactive: 'No',
      },
      {
        type: 'toggle',
        name: 'usePinia',
        message: 'Add Pinia for state management?',
        initial: false,
        active: 'Yes',
        inactive: 'No',
      },
      {
        type: 'toggle',
        name: 'useVitest',
        message: 'Add Vitest for Unit testing?',
        initial: false,
        active: 'Yes',
        inactive: 'No',
      },
      {
        type: 'select',
        name: 'useE2e',
        message: 'Add an End-to-End Testing Solution?',
        choices: [
          { title: 'No', value: false },
          { title: 'Cypress', value: 'cypress' },
          { title: 'Nightwatch', value: 'nightwatch' },
          { title: 'Playwright', value: 'playwright' },
        ],
        initial: 0,
      },
      {
        type: 'toggle',
        name: 'useEslint',
        message: 'Add ESLint for code quality?',
        initial: false,
        active: 'Yes',
        inactive: 'No',
      },
      {
        type: (prev, values) => (values.useEslint ? 'toggle' : null),
        name: 'usePrettier',
        message: 'Add Prettier for code formatting?',
        initial: false,
        active: 'Yes',
        inactive: 'No',
      },
    ],
    { onCancel }
  )

  const {
    useTypeScript = false,
    useJsx = false,
    useRouter = false,
    usePinia = false,
    useVitest = false,
    useE2e = false,
    useEslint = false,
    usePrettier = false,
  } = features

  const flags = {
    projectName,
    useTypeScript,
    useJsx,
    useRouter,
    usePinia,
    useVitest,
    useE2e,
    useEslint,
    usePrettier,
  }

  // Create target directory
  fs.ensureDirSync(targetDir)

  console.log(green('✓') + ` Creating project in ${cyan(targetDir)}...`)

  const templateDir = path.resolve(__dirname, '../template')
  const pluginDir = path.resolve(__dirname, '../vite-plugin-zweb')

  // Copy all template files (skip files we'll handle specially)
  copyDirectory(templateDir, targetDir, flags)

  // Copy vite-plugin-zweb directory
  const targetPluginDir = path.join(targetDir, 'vite-plugin-zweb')
  fs.copySync(pluginDir, targetPluginDir)

  // Rename _gitignore to .gitignore
  const gitignorePath = path.join(targetDir, '_gitignore')
  if (fs.existsSync(gitignorePath)) {
    fs.renameSync(gitignorePath, path.join(targetDir, '.gitignore'))
  }

  const ext = useTypeScript ? 'ts' : 'js'

  // Generate vite.config (overwrite copied version with feature-aware version)
  writeViteConfig(targetDir, flags)

  // Generate src/main.js or main.ts
  writeMainFile(targetDir, flags)

  // Generate App.zweb (router vs non-router variant)
  writeAppZweb(targetDir, useRouter)

  // TypeScript config files
  if (useTypeScript) {
    writeTsConfig(targetDir)
    fs.writeFileSync(
      path.join(targetDir, 'env.d.ts'),
      `/// <reference types="vite/client" />\n\ndeclare module '*.zweb' {\n  import type { DefineComponent } from 'vue'\n  const component: DefineComponent<{}, {}, any>\n  export default component\n}\n`
    )
    // Remove main.js (replaced by main.ts)
    const oldMain = path.join(targetDir, 'src', 'main.js')
    if (fs.existsSync(oldMain)) fs.removeSync(oldMain)
  }

  // Router files
  if (useRouter) {
    fs.ensureDirSync(path.join(targetDir, 'src', 'router'))
    fs.ensureDirSync(path.join(targetDir, 'src', 'views'))
    fs.writeFileSync(path.join(targetDir, 'src', 'router', `index.${ext}`), routerIndexContent(ext))
    fs.writeFileSync(path.join(targetDir, 'src', 'views', 'HomeView.zweb'), homeViewContent())
    fs.writeFileSync(path.join(targetDir, 'src', 'views', 'AboutView.zweb'), aboutViewContent())
  }

  // Pinia store
  if (usePinia) {
    fs.ensureDirSync(path.join(targetDir, 'src', 'stores'))
    fs.writeFileSync(
      path.join(targetDir, 'src', 'stores', `counter.${ext}`),
      counterStoreContent(useTypeScript)
    )
  }

  // Vitest
  if (useVitest) {
    fs.ensureDirSync(path.join(targetDir, 'src', 'components', '__tests__'))
    fs.writeFileSync(
      path.join(targetDir, 'src', 'components', '__tests__', `HelloWorld.spec.${ext}`),
      vitestSpecContent()
    )
  }

  // E2E testing
  if (useE2e === 'cypress') {
    fs.writeFileSync(path.join(targetDir, 'cypress.config.js'), cypressConfigContent())
    fs.ensureDirSync(path.join(targetDir, 'cypress', 'e2e'))
    fs.writeFileSync(path.join(targetDir, 'cypress', 'e2e', 'example.cy.js'), cypressExampleContent())
  } else if (useE2e === 'playwright') {
    fs.writeFileSync(path.join(targetDir, 'playwright.config.js'), playwrightConfigContent())
    fs.ensureDirSync(path.join(targetDir, 'e2e'))
    fs.writeFileSync(path.join(targetDir, 'e2e', 'example.spec.js'), playwrightExampleContent())
  } else if (useE2e === 'nightwatch') {
    fs.writeFileSync(path.join(targetDir, 'nightwatch.conf.js'), nightwatchConfigContent())
    fs.ensureDirSync(path.join(targetDir, 'nightwatch', 'e2e'))
    fs.writeFileSync(
      path.join(targetDir, 'nightwatch', 'e2e', 'example.js'),
      nightwatchExampleContent()
    )
  }

  // ESLint
  if (useEslint) {
    fs.writeFileSync(path.join(targetDir, 'eslint.config.js'), eslintConfigContent())
  }

  // Prettier
  if (usePrettier) {
    fs.writeFileSync(
      path.join(targetDir, '.prettierrc.json'),
      JSON.stringify({ semi: false, singleQuote: true, printWidth: 100 }, null, 2) + '\n'
    )
  }

  console.log()
  console.log(green('✅') + ` ztweb project ${bold(cyan(projectName))} created successfully!`)
  console.log()
  console.log(bold('Next steps:'))
  console.log(`  ${cyan('cd ' + projectName)}`)
  console.log(`  ${cyan('npm install')}`)
  console.log(`  ${cyan('npm run dev')}`)
  console.log()
}

// ---------------------------------------------------------------------------
// Template rendering helpers
// ---------------------------------------------------------------------------

function copyDirectory(src, dest, flags) {
  const files = fs.readdirSync(src)

  for (const file of files) {
    const srcPath = path.join(src, file)
    const destPath = path.join(dest, file)
    const stat = fs.statSync(srcPath)

    if (stat.isDirectory()) {
      fs.ensureDirSync(destPath)
      copyDirectory(srcPath, destPath, flags)
    } else if (file === 'package.json.hbs') {
      const template = fs.readFileSync(srcPath, 'utf-8')
      const compiledTemplate = Handlebars.compile(template)
      const output = compiledTemplate(flags)
      fs.writeFileSync(path.join(dest, 'package.json'), output)
    } else if (file === 'vite.config.js.hbs') {
      // handled separately via writeViteConfig
    } else if (file === 'main.js' || file === 'main.ts') {
      // handled separately via writeMainFile
    } else if (file === 'App.zweb') {
      // handled separately via writeAppZweb
    } else if (file === 'vite.config.js') {
      // handled separately via writeViteConfig
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function writeViteConfig(targetDir, flags) {
  const { useJsx, useTypeScript } = flags
  const ext = useTypeScript ? 'ts' : 'js'
  const lines = [`import { defineConfig } from 'vite'`, `import zweb from 'vite-plugin-zweb'`]
  if (useJsx) lines.push(`import vueJsx from '@vitejs/plugin-vue-jsx'`)
  lines.push(``)
  lines.push(`export default defineConfig({`)
  const plugins = useJsx ? `zweb(), vueJsx()` : `zweb()`
  lines.push(`  plugins: [${plugins}],`)
  lines.push(`})`)
  lines.push(``)
  fs.writeFileSync(path.join(targetDir, `vite.config.${ext}`), lines.join('\n'))
  // Remove old .js if we wrote .ts
  if (useTypeScript) {
    const old = path.join(targetDir, 'vite.config.js')
    if (fs.existsSync(old)) fs.removeSync(old)
  }
}

function writeMainFile(targetDir, flags) {
  const { useTypeScript, useRouter, usePinia } = flags
  const ext = useTypeScript ? 'ts' : 'js'
  const lines = [`import { createApp } from 'vue'`]
  if (usePinia) lines.push(`import { createPinia } from 'pinia'`)
  if (useRouter) lines.push(`import router from './router'`)
  lines.push(`import './style.css'`)
  lines.push(`import App from './App.zweb'`)
  lines.push(``)
  lines.push(`const app = createApp(App)`)
  if (usePinia) lines.push(`app.use(createPinia())`)
  if (useRouter) lines.push(`app.use(router)`)
  lines.push(`app.mount('#app')`)
  lines.push(``)
  fs.ensureDirSync(path.join(targetDir, 'src'))
  fs.writeFileSync(path.join(targetDir, 'src', `main.${ext}`), lines.join('\n'))
}

function writeAppZweb(targetDir, useRouter) {
  let content
  if (useRouter) {
    content = `<script setup>
import HelloWorld from './components/HelloWorld.zweb'
</script>

<template>
  <div>
    <nav>
      <RouterLink to="/">Home</RouterLink>
      <span> | </span>
      <RouterLink to="/about">About</RouterLink>
    </nav>
    <RouterView />
    <HelloWorld msg="Welcome to ztweb!" />
  </div>
</template>

<style scoped>
nav {
  padding: 1em 0;
}
nav a {
  font-weight: bold;
  color: #42b883;
  text-decoration: none;
}
nav a:hover {
  text-decoration: underline;
}
</style>
`
  } else {
    content = `<script setup>
import HelloWorld from './components/HelloWorld.zweb'
</script>

<template>
  <div>
    <a href="https://github.com/techzt13/ztweb" target="_blank">
      <img src="./assets/logo.svg" class="logo" alt="ztweb logo" />
    </a>
    <HelloWorld msg="Welcome to ztweb!" />
  </div>
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
`
  }
  fs.ensureDirSync(path.join(targetDir, 'src'))
  fs.writeFileSync(path.join(targetDir, 'src', 'App.zweb'), content)
}

function writeTsConfig(targetDir) {
  const tsconfig = {
    files: [],
    references: [{ path: './tsconfig.app.json' }, { path: './tsconfig.node.json' }],
  }
  const tsconfigApp = {
    extends: '@vue/tsconfig/tsconfig.dom.json',
    include: ['env.d.ts', 'src/**/*', 'src/**/*.zweb'],
    exclude: ['src/**/__tests__/*'],
    compilerOptions: {
      composite: true,
      tsBuildInfoFile: './node_modules/.tmp/tsconfig.app.tsbuildinfo',
      baseUrl: '.',
      paths: { '@/*': ['./src/*'] },
    },
  }
  const tsconfigNode = {
    extends: '@tsconfig/node20/tsconfig.json',
    include: ['vite.config.*', 'vitest.config.*', 'cypress/**/*', 'playwright/**/*'],
    compilerOptions: {
      composite: true,
      tsBuildInfoFile: './node_modules/.tmp/tsconfig.node.tsbuildinfo',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      types: ['node'],
    },
  }
  fs.writeFileSync(path.join(targetDir, 'tsconfig.json'), JSON.stringify(tsconfig, null, 2) + '\n')
  fs.writeFileSync(
    path.join(targetDir, 'tsconfig.app.json'),
    JSON.stringify(tsconfigApp, null, 2) + '\n'
  )
  fs.writeFileSync(
    path.join(targetDir, 'tsconfig.node.json'),
    JSON.stringify(tsconfigNode, null, 2) + '\n'
  )
}

function routerIndexContent(ext) {
  return `import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../views/HomeView.zweb'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/about',
      name: 'about',
      component: () => import('../views/AboutView.zweb'),
    },
  ],
})

export default router
`
}

function homeViewContent() {
  return `<template>
  <main>
    <h1>Home</h1>
    <p>Welcome to the ztweb app!</p>
  </main>
</template>
`
}

function aboutViewContent() {
  return `<template>
  <main>
    <h1>About</h1>
    <p>This is an About page built with ztweb.</p>
  </main>
</template>
`
}

function counterStoreContent(useTypeScript) {
  if (useTypeScript) {
    return `import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', () => {
  const count = ref<number>(0)
  const doubleCount = computed(() => count.value * 2)
  function increment() {
    count.value++
  }

  return { count, doubleCount, increment }
})
`
  }
  return `import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)
  function increment() {
    count.value++
  }

  return { count, doubleCount, increment }
})
`
}

function vitestSpecContent() {
  return `import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import HelloWorld from '../HelloWorld.zweb'

describe('HelloWorld', () => {
  it('renders properly', () => {
    const wrapper = mount(HelloWorld, { props: { msg: 'Hello Vitest' } })
    expect(wrapper.text()).toContain('Hello Vitest')
  })
})
`
}

function cypressConfigContent() {
  return `import { defineConfig } from 'cypress'

export default defineConfig({
  e2e: {
    specPattern: 'cypress/e2e/**/*.{cy,spec}.{js,jsx,ts,tsx}',
    baseUrl: 'http://localhost:4173',
  },
})
`
}

function cypressExampleContent() {
  return `describe('My App', () => {
  it('visits the app', () => {
    cy.visit('/')
    cy.contains('ztweb')
  })
})
`
}

function playwrightConfigContent() {
  return `import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './e2e',
  use: {
    baseURL: 'http://localhost:4173',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
})
`
}

function playwrightExampleContent() {
  return `import { test, expect } from '@playwright/test'

test('visits the app', async ({ page }) => {
  await page.goto('/')
  await expect(page).toHaveTitle(/ztweb/)
})
`
}

function nightwatchConfigContent() {
  return `module.exports = {
  src_folders: ['nightwatch/e2e'],
  test_settings: {
    default: {
      launch_url: 'http://localhost:4173',
      desiredCapabilities: {
        browserName: 'chrome',
      },
    },
  },
}
`
}

function nightwatchExampleContent() {
  return `module.exports = {
  'visits the app': function (browser) {
    browser
      .url(browser.launchUrl)
      .waitForElementVisible('body')
      .assert.titleContains('ztweb')
      .end()
  },
}
`
}

function eslintConfigContent() {
  return `import pluginVue from 'eslint-plugin-vue'
import js from '@eslint/js'

export default [
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    files: ['**/*.{js,ts,zweb}'],
    rules: {},
  },
]
`
}

function isValidPackageName(name) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)
}

export default init
