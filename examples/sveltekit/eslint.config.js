import antfu from '@antfu/eslint-config'

export default antfu({
  formatters: true,
  svelte: true,
  rules: {
    'no-alert': 'off',
  },
})
