# create-ztweb

Scaffold a new **ztweb** project — a Vue 3 + Vite framework using `.zweb` file extensions.

## What is ztweb?

**ztweb** is a Vue 3 + Vite scaffolding tool that uses `.zweb` Single File Components instead of `.vue` files. `.zweb` files have the exact same syntax as Vue SFCs (`<template>`, `<script setup>`, `<style>` blocks), but use a custom file extension and are compiled by the included `vite-plugin-zweb` plugin.

## Usage

```bash
# Using npm
npm create ztweb@latest

# Or specify a project name directly
npm create ztweb@latest my-app

# Using pnpm
pnpm create ztweb

# Using yarn
yarn create ztweb
```

Then follow the prompts!

Once scaffolded, run:

```bash
cd my-app
npm install
npm run dev
```

Your app will be running at `http://localhost:5173`

## What Gets Scaffolded

The CLI creates a complete Vue 3 + Vite project with:

- **Vue 3** with Composition API (`<script setup>`)
- **Vite 5** for blazing fast dev server and builds
- **`.zweb` files** instead of `.vue` files
- **vite-plugin-zweb** — a custom Vite plugin that compiles `.zweb` SFCs using `@vue/compiler-sfc`
- Hot Module Replacement (HMR) for `.zweb` files
- Support for `<style scoped>`, template expressions, directives, etc.
- Sample components to get you started

## How `.zweb` Files Work

`.zweb` files are **Single File Components** with identical syntax to `.vue` files:

```html
<script setup>
import { ref } from 'vue'
const count = ref(0)
</script>

<template>
  <button @click="count++">{{ count }}</button>
</template>

<style scoped>
button { color: #42b883; }
</style>
```

The only difference is the file extension. The `vite-plugin-zweb` plugin hooks into Vite's transform pipeline and uses Vue's official `@vue/compiler-sfc` to compile `.zweb` files into JavaScript modules.

## Project Structure

```
my-app/
├── index.html
├── package.json
├── vite.config.js
├── jsconfig.json
├── public/
│   └── favicon.ico
├── src/
│   ├── main.js
│   ├── App.zweb           # Main app component
│   ├── style.css
│   ├── assets/
│   │   └── logo.svg
│   └── components/
│       └── HelloWorld.zweb
└── vite-plugin-zweb/      # Custom Vite plugin (bundled locally)
    ├── package.json
    └── index.js
```

## Development Scripts

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run preview  # Preview production build
```

## Contributing to create-ztweb

To develop and test the CLI locally:

```bash
# Clone the repo
git clone https://github.com/techzt13/ztweb.git
cd ztweb

# Install dependencies
npm install

# Link it globally for testing
npm link

# Test scaffolding
create-ztweb my-test-app

# Test the scaffolded app
cd my-test-app
npm install
npm run dev
```

## License

MIT

## Links

- [GitHub Repository](https://github.com/techzt13/ztweb)
- [Vue.js Documentation](https://vuejs.org/)
- [Vite Documentation](https://vitejs.dev/)
