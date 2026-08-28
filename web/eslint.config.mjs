import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import noComments from "./tools/eslint-rules/no-comments.mjs";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([
    ".next/**",
    "out/**",
    "build/**",
    "coverage/**",
    "next-env.d.ts",
    "node_modules/**",
  ]),
  {
    files: [
      "lib/**/*.{ts,tsx,js,mjs,cjs}",
      "app/**/*.{ts,tsx,js,mjs,cjs}",
      "scripts/**/*.{ts,tsx,js,mjs,cjs}",
      "eslint.config.mjs",
      "next.config.ts",
      "playwright.config.ts",
      "postcss.config.mjs",
    ],
    plugins: {
      local: { rules: { "no-comments": noComments } },
    },
    rules: {
      "local/no-comments": "error",
    },
  },
  {
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["tests/unit/**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["scripts/**/*.cjs"],
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
]);

export default eslintConfig;
