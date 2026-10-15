import eslintReact from "@eslint-react/eslint-plugin";
import eslintJs from "@eslint/js";
import { defineConfig, globalIgnores } from "eslint/config";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig([
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "test-results/**",
    "playwright-report/**",
    "blob-report/**",
    "lib/generated/prisma/**",
    "next-env.d.ts",
  ]),
  eslintJs.configs.recommended,
  eslintReact.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{mjs,cjs}"],
    languageOptions: { globals: globals.node },
  },
]);
