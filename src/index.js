import fs from 'fs-extra'
import path from 'path'
import { fileURLToPath } from 'url'
import prompts from 'prompts'
import minimist from 'minimist'
import { red, green, bold, cyan } from 'kolorist'
import Handlebars from 'handlebars'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function init() {
  const argv = minimist(process.argv.slice(2))

  let projectName = argv._[0]

  // If no project name provided, ask interactively
  if (!projectName) {
    const result = await prompts(
      {
        type: 'text',
        name: 'projectName',
        message: 'Project name:',
        initial: 'ztweb-project',
      },
      {
        onCancel: () => {
          console.log(red('✖') + ' Operation cancelled')
          process.exit(1)
        },
      }
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
      const result = await prompts({
        type: 'confirm',
        name: 'overwrite',
        message: `Directory ${cyan(projectName)} already exists and is not empty. Continue?`,
        initial: false,
      })

      if (!result.overwrite) {
        console.log(red('✖') + ' Operation cancelled')
        process.exit(1)
      }
    }
  }

  // Create target directory
  fs.ensureDirSync(targetDir)

  console.log(green('✓') + ` Creating project in ${cyan(targetDir)}...`)

  const templateDir = path.resolve(__dirname, '../template')
  const pluginDir = path.resolve(__dirname, '../vite-plugin-zweb')

  // Copy all template files
  copyDirectory(templateDir, targetDir, projectName)

  // Copy vite-plugin-zweb directory
  const targetPluginDir = path.join(targetDir, 'vite-plugin-zweb')
  fs.copySync(pluginDir, targetPluginDir)

  // Rename _gitignore to .gitignore
  const gitignorePath = path.join(targetDir, '_gitignore')
  if (fs.existsSync(gitignorePath)) {
    fs.renameSync(gitignorePath, path.join(targetDir, '.gitignore'))
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

function copyDirectory(src, dest, projectName) {
  const files = fs.readdirSync(src)

  for (const file of files) {
    const srcPath = path.join(src, file)
    const destPath = path.join(dest, file)
    const stat = fs.statSync(srcPath)

    if (stat.isDirectory()) {
      fs.ensureDirSync(destPath)
      copyDirectory(srcPath, destPath, projectName)
    } else {
      // Handle package.json.hbs specially
      if (file === 'package.json.hbs') {
        const template = fs.readFileSync(srcPath, 'utf-8')
        const compiledTemplate = Handlebars.compile(template)
        const output = compiledTemplate({ projectName })
        fs.writeFileSync(path.join(dest, 'package.json'), output)
      } else {
        fs.copyFileSync(srcPath, destPath)
      }
    }
  }
}

function isValidPackageName(name) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name)
}

export default init
