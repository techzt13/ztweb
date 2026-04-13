# create-ztweb — Coding Agent Prompt

## Title: Create `create-ztweb` — a scaffolding CLI package (like `create-vue`) powered by Vue + Vite

## Description

Build a complete npm initializer package called **`create-ztweb`** that works with `npm create ztweb@latest` (which npm resolves to the `create-ztweb` package). It should scaffold a new Vue 3 + Vite project, similar to how `create-vue` or `npm create vite` works, but branded as **ztweb**.

---

## Repository Structure

Create the following project structure:

```
create-ztweb/
├── package.json
├── README.md
├── LICENSE
├── bin/
│   └── create-ztweb.js          # CLI entry point (hashbang #!/usr/bin/env node)
├── src/
│   └── index.js                 # Main scaffolding logic
├── template/                    # The Vue+Vite project template to copy
│   ├── package.json.hbs         # Handlebars template for the generated package.json
│   ├── index.html
│   ├── vite.config.js
│   ├── jsconfig.json
│   ├── _gitignore               # Renamed to .gitignore during scaffolding
│   ├── public/
│   │   └── favicon.ico
│   └── src/
│       ├── main.js
│       ├── App.vue
│       ├── style.css
│       ├── assets/
│       │   └── logo.svg          # Simple placeholder SVG logo branded "ztweb"
│       └── components/
│           └── HelloWorld.vue
└── .gitignore
```

---

## Detailed Requirements

### 1. `package.json` (root — the `create-ztweb` package itself)

- **name**: `create-ztweb`
- **version**: `1.0.0`
- **type**: `module`
- **bin**: `{ "create-ztweb": "bin/create-ztweb.js" }`
- **dependencies**: `prompts`, `kolorist` (for colored terminal output), `fs-extra`, `minimist`, `handlebars`
- **description**: "Scaffold a new ztweb (Vue + Vite) project"
- **keywords**: `["ztweb", "vue", "vite", "scaffold", "cli"]`
- **license**: MIT

### 2. `bin/create-ztweb.js`

- Hashbang line `#!/usr/bin/env node`
- Simply imports and runs the main function from `../src/index.js`

### 3. `src/index.js` — Main CLI Logic

The CLI should:

1. Parse command-line args with `minimist`. If a positional arg is given, use it as the project name.
2. If no project name is provided, use `prompts` to interactively ask:
   - **Project name** (default: `ztweb-project`)
3. Validate the project name (valid npm package name characters).
4. Create the target directory. If it already exists and is non-empty, ask for confirmation to overwrite.
5. Copy all files from the `template/` directory into the target directory.
6. Process `package.json.hbs` through Handlebars, injecting the project name, and write it as `package.json` in the output.
7. Rename `_gitignore` to `.gitignore` in the output (template ships it as `_gitignore` to avoid npm ignoring it).
8. Print success message with next steps in color using `kolorist`:

```
✅ ztweb project "my-app" created successfully!

Next steps:
  cd my-app
  npm install
  npm run dev
```

### 4. Template Files (what gets scaffolded)

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
    "@vitejs/plugin-vue": "^5.0.0",
    "vite": "^5.0.0"
  }
}
```

**`template/vite.config.js`**

```js
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
})
```

**`template/index.html`** — Standard Vite HTML entry point loading `/src/main.js`, with `<title>ztweb App</title>`.

**`template/src/main.js`** — Standard Vue 3 `createApp(App).mount('#app').

**`template/src/App.vue`** — A root component that imports and renders `HelloWorld.vue`, with basic styling.

**`template/src/components/HelloWorld.vue`** — A component with:

- A prop `msg`
- Displays the message and a "Welcome to ztweb" heading
- A counter button (Vue reactive demo)
- Links to Vue and Vite docs

**`template/src/style.css`** — Basic modern CSS reset and styling.

**`template/src/assets/logo.svg`** — A simple SVG with the text "ZT" as a placeholder logo.

**`template/_gitignore`** (renamed to `.gitignore` during scaffolding):

```
node_modules

```

### 5. `README.md`

Include:

- Project name & description
- How to use: `npm create ztweb@latest`
- What it scaffolds
- Development instructions for contributing to the CLI itself

---

## How `npm create ztweb@latest` Works

When a user runs `npm create ztweb@latest`, npm automatically:

1. Downloads and installs the `create-ztweb` package from the npm registry
2. Executes the binary defined in its `bin` field

So the package MUST be named `create-ztweb` on npm for `npm create ztweb@latest` to work.

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
- The scaffolded template should be a clean, minimal Vue 3 + Vite app.
- All terminal output should be user-friendly with colors via `kolorist`.
- Handle edge cases: existing directory, empty project name, Ctrl+C cancellation.

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
```