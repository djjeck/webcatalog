import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'
import importPlugin from 'eslint-plugin-import'
import simpleImportSort from 'eslint-plugin-simple-import-sort'
import unusedImports from 'eslint-plugin-unused-imports'

export default defineConfig([
  globalIgnores(['dist', 'coverage', '__tests__']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    plugins: {
      import: importPlugin,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/consistent-type-imports': [
        'error',
        {
          prefer: 'type-imports',
          fixStyle: 'inline-type-imports',
          disallowTypeAnnotations: false,
        },
      ],
      'import/consistent-type-specifier-style': ['error', 'prefer-inline'],
      'import/no-duplicates': ['error', { 'prefer-inline': true }],
      'unused-imports/no-unused-imports': 'error',
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../*', '../**'],
              message:
                'Use the ~/ alias for cross-directory imports. Keep ./foo for same-directory imports.',
            },
          ],
        },
      ],
      'simple-import-sort/imports': [
        'error',
        {
          groups: [
            [
              '^react$',
              '^react-',
              '^(?!~(?:/|$))@?\\w',
              '^~(?:/.*|$)',
              '^\\.(?!.*\\.(?:css|scss)$)',
              '^\\u0000.*\\.(?:css|scss)$',
              '^\\u0000',
            ],
          ],
        },
      ],
      'simple-import-sort/exports': 'error',
    },
  },
])
