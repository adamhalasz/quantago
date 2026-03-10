import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
    {
        ignores: ['dist', '.wrangler', 'node_modules'],
    },
    {
        extends: [js.configs.recommended, ...tseslint.configs.recommended],
        files: ['**/*.ts'],
        languageOptions: {
            ecmaVersion: 2022,
            globals: {
                ...globals.es2021,
                ...globals.serviceworker,
            },
        },
        rules: {
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
            'prefer-const': 'warn',
        },
    },
);