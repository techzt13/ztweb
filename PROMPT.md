# create-ztweb — Coding Agent Prompt

## Title: Create `create-ztweb` — a scaffolding CLI package (like `create-vue`) powered by Vue + Vite, using `.zweb` file extension

## Description

Build a complete npm initializer package called **`create-ztweb`** that works with `npm create ztweb@latest` (which npm resolves to the `create-ztweb` package). It should scaffold a new Vue 3 + Vite project, similar to how `create-vue` or `npm create vite` works, but branded as **ztweb**.

**CRITICAL DIFFERENCE**: Instead of using `.vue` files, this framework uses its own **`.zweb`** file extension. `.zweb` files are Single File Components (SFCs) with the exact same syntax as `.vue` files (`<template>`, `<script setup>`, `<style>` blocks), but they use the `.zweb` extension. A **custom Vite plugin (`vite-plugin-zweb`)** is included that compiles `.zweb` files by piping them through Vue's SFC compiler (`@vue/compiler-sfc`).

---

## Repository Structure

Create the following project structure:

```
create-ztweb/
├── package.json
├── README.md
├── LICENSE
├── bin/
│   └── create-ztweb.js              # CLI entry point (hashbang #!/usr/bin/env node)
├── src/
│   └── index.js                     # Main scaffolding logic
├── vite-plugin-zweb/                # The custom Vite plugin (bundled into scaffolded projects)
│   ├── package.json
│   └── index.js                     # Vite plugin that compiles .zweb files
├── template/                        # The Vue+Vite project template to copy
│   ├── package.json.hbs             # Handlebars template for the generated package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── jsconfig.json
│   ├── _gitignore                   # Renamed to .gitignore during scaffolding
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── main.js
│       ├── App.zweb                 # <-- .zweb instead of .vue
│       ├── style.css
│       ├── assets/
│       │   └── logo.svg             # Simple placeholder SVG logo branded "ztweb"
│       └── components/
│           └── HelloWorld.zweb      # <-- .zweb instead of .vue
└── .gitignore
```

---

## Detailed Requirements

### 1. `vite-plugin-zweb` — Custom Vite Plugin (THE CORE FEATURE)

This is what makes `.zweb` files work. Create a Vite plugin in `vite-plugin-zweb/index.js` that:

1. **Resolves `.zweb` files** — Tells Vite to treat `.zweb` imports as modules.
2. **Transforms `.zweb` files** — On `transform` hook, when a `.zweb` file is loaded:
   - Read the file content
   - Use `@vue/compiler-sfc` to parse the SFC (`parse()`)
   - Use `@vue/compiler-sfc` to compile each block:
     - `compileScript()` for the `<script setup>` / `<script>` block
     - `compileTemplate()` for the `<template>` block
     - `compileStyle()` for the `<style>` block (with scoped support)
   - Assemble the compiled output into a single JavaScript module that exports a Vue component
   - Handle hot module replacement (HMR) so `npm run dev` live-reloads `.zweb` changes
3. **Sets up HMR** — Accept HMR updates for `.zweb` files so Vite dev server hot-reloads them.

**`vite-plugin-zweb/package.json`**:
```json
{
  "name": "vite-plugin-zweb",
  "version": "1.0.0",
  "type": "module",
  "main": "index.js",
  "dependencies": {
    "@vue/compiler-sfc": "^3.4.0"
  },
  "peerDependencies": {
    "vite": "^5.0.0"
  }
}
```

**`vite-plugin-zweb/index.js`** pseudo-structure:
```js
import { parse, compileScript, compileTemplate, compileStyleAsync } from '@vue/compiler-sfc'
import { createHash } from 'crypto'

export default function zwebPlugin() {
  return {
    name: 'vite-plugin-zweb',

    resolve: {
      extensions: ['.zweb']
    },

    // Tell Vite to handle .zweb files
    transform(code, id) {
      if (!id.endsWith('.zweb')) return null

      // 1. Parse the SFC
      const { descriptor, errors } = parse(code, { filename: id })
      if (errors.length) throw errors[0]

      // 2. Compile script block
      // 3. Compile template block
      // 4. Compile style blocks (with scoped ID)
      // 5. Assemble final JS module
      // 6. Return { code: compiledCode, map: sourceMap }
    },

    // Handle HMR
    handleHotUpdate({ file, server }) {
      if (file.endsWith('.zweb')) {
        // Trigger HMR update
      }
    }
  }
}
```

**IMPORTANT**: The plugin must fully compile `.zweb` SFCs so they work identically to `.vue` files. This includes:
- `<script setup>` support
- `<style scoped>` support (generate scoped data attributes)
- Template expressions, directives, v-model, etc.
- Source maps for debugging
- Proper error reporting with file/line info

### 2. `package.json` (root — the `create-ztweb` package itself)

- **name**: `create-ztweb`
- **version**: `1.0.0`
- **type**: `module`
- **bin**: `{ "create-ztweb": "bin/create-ztweb.js" }`
- **dependencies**: `prompts`, `kolorist` (for colored terminal output), `fs-extra`, `minimist`, `handlebars`
- **description**: "Scaffold a new ztweb (Vue + Vite) project with .zweb file support"
- **keywords**: `["ztweb", "vue", "vite", "scaffold", "cli", "zweb"]`
- **license**: MIT

### 3. `bin/create-ztweb.js`

- Hashbang line `#!/usr/bin/env node`
- Simply imports and runs the main function from `../src/index.js`

### 4. `src/index.js` — Main CLI Logic

The CLI should:

1. Parse command-line args with `minimist`. If a positional arg is given, use it as the project name.
2. If no project name is provided, use `prompts` to interactively ask:
   - **Project name** (default: `ztweb-project`)
3. Validate the project name (valid npm package name characters).
4. Create the target directory. If it already exists and is non-empty, ask for confirmation to overwrite.
5. Copy all files from the `template/` directory into the target directory.
6. **Copy the `vite-plugin-zweb/` directory** into the target directory (so the plugin is available locally).
7. Process `package.json.hbs` through Handlebars, injecting the project name, and write it as `package.json` in the output.
8. Rename `_gitignore` to `.gitignore` in the output (template ships it as `_gitignore` to avoid npm ignoring it).
9. Print success message with next steps in color using `kolorist`:

```
✅ ztweb project "my-app" created successfully!

Next steps:
  cd my-app
  npm install
  npm run dev
```

### 5. Template Files (what gets scaffolded)

**`template/package.json.hbs`**

```json
{
  "name": "{{projectName}}",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "vue": "^3.4.0"
  },
  "devDependencies": {
    "@vue/compiler-sfc": "^3.4.0",
    "vite": "^5.0.0",
    "vite-plugin-zweb": "file:./vite-plugin-zweb"
  }
}
```

Note: `vite-plugin-zweb` is referenced as a local file dependency (`file:./vite-plugin-zweb`) since the plugin is bundled into the scaffolded project.

**`template/vite.config.js`**

```js
import { defineConfig } from 'vite'
import zweb from 'vite-plugin-zweb'

export default defineConfig({
  plugins: [zweb()],
})
```

**`template/index.html`** — Standard Vite HTML entry point loading `/src/main.js`, with `<title>ztweb App</title>`.

**`template/src/main.js`**:
```js
import { createApp } from 'vue'
import './style.css'
import App from './App.zweb'

createApp(App).mount('#app')
```

**`template/src/App.zweb`**:
```html
<script setup>
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
```

**`template/src/components/HelloWorld.zweb`**:
```html
<script setup>
import { ref } from 'vue'

defineProps({
  msg: String,
})

const count = ref(0)
</script>

<template>
  <h1>{{ msg }}</h1>
  <div class="card">
    <button type="button" @click="count++">count is {{ count }}</button>
    <p>
      Edit <code>src/components/HelloWorld.zweb</code> to test HMR
    </p>
  </div>
  <p>
    Check out the
    <a href="https://vuejs.org/guide/quick-start.html" target="_blank">Vue docs</a>,
    and the
    <a href="https://vitejs.dev/guide/" target="_blank">Vite docs</a>.
  </p>
  <p class="powered">Powered by <strong>ztweb</strong> — Vue + Vite with .zweb files</p>
</template>

<style scoped>
.card {
  padding: 2em;
}
h1 {
  color: #42b883;
}
.powered {
  margin-top: 2em;
  color: #888;
}
</style>
```

**`template/src/style.css`** — Basic modern CSS reset and styling.

**`template/src/assets/logo.svg`** — A simple SVG with the text "ZT" as a placeholder logo, styled in Vue green (#42b883).

**`template/src/components/HelloWorld.zweb`**:
```html
<script setup>
import { ref } from 'vue'

defineProps({
  msg: String,
})

const count = ref(0)
</script>

<template>
  <h1>{{ msg }}</h1>
  <div class="card">
    <button type="button" @click="count++">count is {{ count }}</button>
    <p>
      Edit <code>src/components/HelloWorld.zweb</code> to test HMR
    </p>
  </div>
  <p>
    Check out the
    <a href="https://vuejs.org/guide/quick-start.html" target="_blank">Vue docs</a>,
    and the
    <a href="https://vitejs.dev/guide/" target="_blank">Vite docs</a>.
  </p>
  <p class="powered">Powered by <strong>ztweb</strong> — Vue + Vite with .zweb files</p>
</template>

<style scoped>
.card {
  padding: 2em;
}
h1 {
  color: #42b883;
}
.powered {
  margin-top: 2em;
  color: #888;
}
</style>
```

**`template/src/style.css`** — Basic modern CSS reset and styling.

**`template/_gitignore`** (renamed to `.gitignore` during scaffolding):
```
node_modules
dist
*.local
.DS_Store
```

**`template/jsconfig.json`**:
```json
{
  "compilerOptions": {
    "paths": { "@/*": ["./src/*"] }
  }
}
```

### 6. `README.md`

Include:

- Project name & description
- How to use: `npm create ztweb@latest`
- What it scaffolds
- Explanation that `.zweb` files are SFCs just like `.vue` but with a custom extension
- Development instructions for contributing to the CLI itself

---

## How `npm create ztweb@latest` Works

When a user runs `npm create ztweb@latest`, npm automatically:

1. Downloads and installs the `create-ztweb` package from the npm registry
2. Executes the binary defined in its `bin` field

So the package MUST be named `create-ztweb` on npm for `npm create ztweb@latest` to work.

---

## How `.zweb` Files Work

`.zweb` files use the **exact same syntax** as Vue SFCs:

```html
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>

<style scoped>
button { color: green; }
</style>
```

The only difference is the file extension. The `vite-plugin-zweb` plugin hooks into Vite's transform pipeline and uses `@vue/compiler-sfc` (the same compiler Vue uses) to compile `.zweb` files into JavaScript modules.

---

## Testing Locally Before Publishing

```bash
# Clone and link locally
git clone <repo-url>
cd create-ztweb
npm link

# Now test it
npm create ztweb@latest
# or directly:
create-ztweb my-test-app

# Verify .zweb files work
cd my-test-app
npm install
npm run dev
# Open http://localhost:5173 — you should see the ztweb app with .zweb components working!
```

## Publishing to npm

```bash
npm login
npm publish
```

---

## Key Constraints

- Use **ESM** (`"type": "module"`) throughout.
- No TypeScript in the CLI itself (keep it simple JS).
- The scaffolded template should be a clean, minimal Vue 3 + Vite app using **`.zweb` files instead of `.vue`**.
- The `vite-plugin-zweb` must fully support `<script setup>`, `<style scoped>`, template compilation, and HMR.
- All terminal output should be user-friendly with colors via `kolorist`.
- Handle edge cases: existing directory, empty project name, Ctrl+C cancellation.
- `.zweb` files must be syntactically identical to `.vue` SFCs — same `<template>`, `<script>`, `<style>` blocks.

---

## Setup Instructions (After the Code is Built)

### Local Development & Testing

```bash
# 1. Navigate into the project
cd create-ztweb

# 2. Install the CLI's own dependencies
npm install

# 3. Link it globally so you can test locally
npm link

# 4. Test scaffolding a new project
create-ztweb my-app
# — or —
npm create ztweb my-app

# 5. Try the scaffolded app
cd my-app
npm install
npm run dev
# Open http://localhost:5173 in your browser
# You should see a working app powered by .zweb components!
```

### Publishing to npm (makes `npm create ztweb@latest` work globally)

```bash
# 1. Make sure you have an npm account (https://www.npmjs.com/signup)
npm login

# 2. Check the package name is available
npm view create-ztweb

# 3. Publish!
npm publish

# 4. Now anyone in the world can run:
npm create ztweb@latest
```

### After Publishing — Usage

```bash
# Scaffold a new ztweb project
npm create ztweb@latest

# Or with a project name directly
npm create ztweb@latest my-awesome-app

# Then in your project, create .zweb files instead of .vue files!
```