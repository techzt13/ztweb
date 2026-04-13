import { parse, compileScript, compileTemplate, compileStyleAsync } from '@vue/compiler-sfc'
import { createHash } from 'crypto'

export default function zwebPlugin() {
  const cache = new Map()

  return {
    name: 'vite-plugin-zweb',

    config() {
      return {
        resolve: {
          extensions: ['.zweb', '.js', '.json']
        }
      }
    },

    async transform(code, id) {
      if (!id.endsWith('.zweb')) return null

      const filename = id.split('?')[0]

      // Parse the SFC
      const { descriptor, errors } = parse(code, {
        filename,
        sourceMap: true
      })

      if (errors.length) {
        throw errors[0]
      }

      // Generate a scoped ID for this component
      const scopeId = `data-v-${generateId(filename)}`

      let output = ''
      const attachedProps = []

      // 1. Compile script block
      if (descriptor.script || descriptor.scriptSetup) {
        const script = compileScript(descriptor, {
          id: scopeId,
          inlineTemplate: false,
          templateOptions: {
            id: scopeId,
            scoped: descriptor.styles.some(s => s.scoped),
            slotted: descriptor.slotted
          }
        })

        output += script.content.replace('export default', 'const __component__ =')
        output += '\n'
      } else {
        output += 'const __component__ = {}\n'
      }

      // 2. Compile template block
      if (descriptor.template) {
        const template = compileTemplate({
          id: scopeId,
          source: descriptor.template.content,
          filename,
          scoped: descriptor.styles.some(s => s.scoped),
          slotted: descriptor.slotted,
          compilerOptions: {
            mode: 'module',
            scopeId: descriptor.styles.some(s => s.scoped) ? scopeId : undefined
          }
        })

        if (template.errors.length) {
          throw template.errors[0]
        }

        output += template.code.replace('export function render', 'function render')
        output += '\n__component__.render = render\n'
      }

      // 3. Compile style blocks
      if (descriptor.styles.length) {
        for (let i = 0; i < descriptor.styles.length; i++) {
          const style = descriptor.styles[i]
          const compiled = await compileStyleAsync({
            source: style.content,
            filename,
            id: scopeId,
            scoped: style.scoped,
            modules: style.module != null
          })

          if (compiled.errors.length) {
            throw compiled.errors[0]
          }

          // Inject the style
          output += `
const __style${i}__ = document.createElement('style')
__style${i}__.innerHTML = ${JSON.stringify(compiled.code)}
document.head.appendChild(__style${i}__)
`
        }
      }

      // Add scoped ID if needed
      if (descriptor.styles.some(s => s.scoped)) {
        output += `\n__component__.__scopeId = "${scopeId}"\n`
      }

      // HMR support
      if (!process.env.VITEST) {
        output += `
if (import.meta.hot) {
  __component__.__hmrId = "${scopeId}"
  import.meta.hot.accept(mod => {
    if (!mod) return
    const updated = mod.default
    updated.__hmrId = "${scopeId}"
    import.meta.hot.data.instances?.forEach(instance => {
      if (instance.$.type.__hmrId === "${scopeId}") {
        instance.$.type = updated
        instance.$.proxy?.$forceUpdate()
      }
    })
  })
}
`
      }

      output += '\n__component__.__file = ' + JSON.stringify(filename) + '\n'
      output += 'export default __component__\n'

      return {
        code: output,
        map: null
      }
    },

    handleHotUpdate({ file, server }) {
      if (file.endsWith('.zweb')) {
        cache.delete(file)

        const module = server.moduleGraph.getModuleById(file)
        if (module) {
          server.moduleGraph.invalidateModule(module)
          return [module]
        }
      }
    }
  }
}

function generateId(filename) {
  return createHash('md5').update(filename).digest('hex').substring(0, 8)
}
