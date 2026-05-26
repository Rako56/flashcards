// eslint.config.mjs (Plan 1.2)
// ESLint v9 flat config — no-mercy rules per RESEARCH.md Pattern 2.
// Severity `error` for everything that causes prod bugs.
// Custom rule blocks UUID literals in code (forces getConcursoBySlug() use).
import js from '@eslint/js'
import tsEslint from 'typescript-eslint'
import nextPlugin from '@next/eslint-plugin-next'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default tsEslint.config(
  // Hard ignores — never lint these. lint-fixtures/ exists ONLY to be linted
  // explicitly with --no-ignore (Plan 1.4 + 1.10 gate-break proofs). Default
  // `pnpm lint` must not touch them.
  {
    ignores: [
      '.next/',
      'node_modules/',
      'coverage/',
      'playwright-report/',
      'public/',
      'types/database.types.ts',
      'tests/lint-fixtures/',
      'next-env.d.ts',
      '*.tsbuildinfo',
      '.husky/_/',
      // Vite-era leftovers on disk (untracked in git) — Plan 1.6 era cleanup
      // pending; ignoring here so lint doesn't break on them. Once removed
      // from disk, these entries can come out.
      'dist/',
      'scripts/',
    ],
  },
  // Base JS recommended for every file
  js.configs.recommended,
  // Typed-linting strict + stylistic. typescript-eslint applies these only to TS files.
  ...tsEslint.configs.strictTypeChecked,
  ...tsEslint.configs.stylisticTypeChecked,
  {
    // Project-wide typed linting setup.
    languageOptions: {
      parserOptions: {
        project: './tsconfig.json',
        tsconfigRootDir: import.meta.dirname,
      },
    },
    plugins: {
      '@next/next': nextPlugin,
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...nextPlugin.configs.recommended.rules,
      ...nextPlugin.configs['core-web-vitals'].rules,
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error', // ERROR not warn

      // The "no any disease" wall
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/no-unsafe-assignment': 'error',
      '@typescript-eslint/no-unsafe-member-access': 'error',
      '@typescript-eslint/no-unsafe-call': 'error',
      '@typescript-eslint/no-unsafe-return': 'error',
      '@typescript-eslint/no-unsafe-argument': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      '@typescript-eslint/consistent-type-assertions': [
        'error',
        { assertionStyle: 'as', objectLiteralTypeAssertions: 'never' },
      ],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Prevent silent failures
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        {
          // Block hardcoded UUIDs in code — force getConcursoBySlug()
          selector:
            'Literal[value=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i]',
          message: 'Hardcoded UUIDs are forbidden. Use getConcursoBySlug() or a typed constant.',
        },
      ],

      // Block deep relative imports — force @/ alias.
      // Also block server-only admin client from non-server contexts.
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*'],
              message: 'Use @/ alias instead of deep relative imports.',
            },
            {
              group: ['*/lib/supabase/admin'],
              message: "Import lib/supabase/admin only with explicit 'server-only' guard.",
            },
          ],
        },
      ],
    },
  },
  {
    // Test files are looser on rules that fight test ergonomics.
    // Tests may use `any` for mocks, may assert on `false && x` patterns,
    // and may call narrowed types where the static analyzer can't infer.
    files: ['**/*.test.{ts,tsx}', 'tests/**/*.{ts,tsx}', 'e2e/**/*.{ts,tsx}'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unnecessary-condition': 'off',
      '@typescript-eslint/no-non-null-assertion': 'off',
      'no-constant-binary-expression': 'off',
      'no-constant-condition': 'off',
    },
  },
  {
    // Config files (Tailwind, PostCSS, Next, Vitest, ESLint itself) live
    // outside `tsconfig.json`'s `include`, so typed-linting rules can't load.
    // Apply the official `disableTypeChecked` recipe per
    // https://typescript-eslint.io/users/configs#disable-type-checked
    files: ['*.config.{ts,mjs,js,cjs}', '*.config.*.{ts,mjs,js,cjs}', 'eslint.config.mjs'],
    extends: [tsEslint.configs.disableTypeChecked],
    rules: {
      // Plain ESLint + non-typed rules still apply; keep CJS-style require()
      // legal in config files (Tailwind v3 plugins).
      '@typescript-eslint/no-require-imports': 'off',
    },
  },
  {
    // Lint-fixtures override — these files are tracked but excluded from
    // tsconfig.json `include`, so typed linting can't parse them. They are
    // also in the top-level `ignores` array, so default `pnpm lint` skips
    // them. When Plan 1.4 + 1.10 probe them with `--no-ignore`, ESLint will
    // apply THIS block, which:
    //   1. Sets parserOptions.project = false so the parser doesn't try to
    //      load tsconfig (which excludes these files).
    //   2. Disables typed-linting rules (those need project info).
    //   3. RE-ENABLES the specific AST-based gate rules so the probes fire
    //      (disableTypeChecked turns these off as part of the bundle).
    files: ['tests/lint-fixtures/**/*.ts', 'tests/lint-fixtures/**/*.tsx'],
    extends: [tsEslint.configs.disableTypeChecked],
    languageOptions: {
      parserOptions: {
        project: false,
        projectService: false,
      },
    },
    rules: {
      // Re-enable AST-based gates explicitly (these don't need type info).
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-restricted-syntax': [
        'error',
        {
          selector:
            'Literal[value=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i]',
          message: 'Hardcoded UUIDs are forbidden. Use getConcursoBySlug() or a typed constant.',
        },
      ],
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['../../*'],
              message: 'Use @/ alias instead of deep relative imports.',
            },
            {
              group: ['*/lib/supabase/admin'],
              message: "Import lib/supabase/admin only with explicit 'server-only' guard.",
            },
          ],
        },
      ],
    },
  },
)
