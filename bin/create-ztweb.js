#!/usr/bin/env node

import('../src/index.js').then(({ default: init }) => {
  init().catch((e) => {
    console.error(e)
    process.exit(1)
  })
})
