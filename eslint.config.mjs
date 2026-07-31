import js from "@eslint/js";
import globals from "globals";
import { config, configs } from "typescript-eslint";

export default config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.expo/**",
      "**/.next/**",
      "**/coverage/**",
      "server/drizzle/**",
      "core/dist/**",
    ],
  },
  js.configs.recommended,
  ...configs.strictTypeChecked,
  ...configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports", fixStyle: "inline-type-imports" },
      ],
      "@typescript-eslint/no-non-null-assertion": "error",
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/restrict-template-expressions": [
        "error",
        { allowNumber: true },
      ],
      "@typescript-eslint/consistent-type-definitions": "off",
      "no-console": ["error", { allow: ["warn", "error"] }],
      eqeqeq: ["error", "always"],
      "prefer-const": "error",
      "no-var": "error",
    },
  },
  {
    files: ["scripts/**/*.mjs", "server/scripts/**/*.ts"],
    rules: {
      "no-console": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
    },
  },
  {
    files: ["eslint.config.mjs"],
    rules: { "@typescript-eslint/no-deprecated": "off" },
  },
  {
    files: ["**/*.test.ts"],
    rules: { "@typescript-eslint/no-non-null-assertion": "off" },
  },
);
