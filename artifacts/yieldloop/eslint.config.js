import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Unmodified shadcn scaffold is outside the foundation application lint scope.
  { ignores: ['dist/**', 'src/components/ui/**', 'src/hooks/use-toast.ts'] },
  {
    files: ['src/**/*.{ts,tsx}'],
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    languageOptions: { globals: globals.browser },
  },
);
