module.exports = {
  root: true,
  env: {
    browser: true,
    mocha: true
  },
  extends: [
    'standard'
  ],
  plugins: [
  ],
  rules: {
    // allow async-await
    'generator-star-spacing': 'off',
    // allow debugger during development
    'no-debugger': process.env.NODE_ENV === 'production' ? 'error' : 'off',
    'semi': [1, 'always'],
    'space-before-function-paren': 'off'
  }
}
