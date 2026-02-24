import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import globals from 'globals';

export default tseslint.config(
  // Global ignores
  {
    ignores: [
      'dist/',
      'node_modules/',
      'coverage/',
      '.atena/',
      '.hefesto/',
      '*.config.js',
      '*.config.ts',
      '*.config.mjs',
    ],
  },

  // Base configs
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,

  // Svelte recommended
  ...sveltePlugin.configs['flat/recommended'],

  // Global settings for all TS files
  {
    files: ['**/*.ts', '**/*.js'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2022,
        chrome: 'readonly',
      },
      parserOptions: {
        project: './tsconfig.json',
        extraFileExtensions: ['.svelte'],
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': ['warn', {
        allowExpressions: true,
        allowTypedFunctionExpressions: true,
        allowHigherOrderFunctions: true,
        allowDirectConstAssertionInArrowFunctions: true,
      }],
      '@typescript-eslint/explicit-module-boundary-types': 'warn',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': ['error', {
        checksVoidReturn: { attributes: false },
      }],
      '@typescript-eslint/await-thenable': 'error',
      '@typescript-eslint/no-unnecessary-type-assertion': 'warn',
      '@typescript-eslint/strict-boolean-expressions': ['warn', {
        allowString: true,
        allowNumber: true,
        allowNullableObject: true,
        allowNullableBoolean: false,
        allowNullableString: true,
        allowNullableNumber: false,
        allowAny: false,
      }],
      '@typescript-eslint/consistent-type-imports': ['error', {
        prefer: 'type-imports',
        fixStyle: 'separate-type-imports',
      }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',
      'prefer-template': 'warn',
    },
  },

  // Svelte files
  {
    files: ['**/*.svelte'],
    languageOptions: {
      parser: svelteParser,
      parserOptions: {
        parser: tseslint.parser,
        project: './tsconfig.json',
        extraFileExtensions: ['.svelte'],
      },
      globals: {
        ...globals.browser,
        chrome: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      'svelte/require-each-key': 'warn',
      'svelte/no-reactive-reassign': 'warn',
      'svelte/no-immutable-reactive-statements': 'warn',
      'no-useless-assignment': 'off',
      '@typescript-eslint/require-await': 'off',
      'svelte/no-at-html-tags': 'error',
      'svelte/valid-compile': 'error',
      'svelte/no-unused-svelte-ignore': 'error',
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'svelte/no-dom-manipulating': 'warn',
      'svelte/require-store-reactive-access': 'warn',
      'svelte/button-has-type': 'error',
      'svelte/no-dupe-else-if-blocks': 'error',
      'svelte/no-dupe-style-properties': 'error',
      'svelte/no-dynamic-slot-name': 'error',
      'svelte/no-inner-declarations': 'error',
      'svelte/no-not-function-handler': 'error',
      'svelte/no-object-in-text-mustaches': 'error',
      'svelte/no-shorthand-style-property-overrides': 'error',
      'svelte/no-unknown-style-directive-property': 'error',
    },
  },

  // Background service worker files
  {
    files: ['src/background/**/*.ts'],
    languageOptions: {
      globals: {
        ...globals.serviceworker,
      },
    },
    rules: {
      'no-restricted-globals': ['error',
        { name: 'document', message: 'document is not available in service workers' },
        { name: 'window', message: 'window is not available in service workers' },
      ],
    },
  },

  // Test files
  {
    files: ['**/*.test.ts', '**/*.spec.ts'],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },
);
