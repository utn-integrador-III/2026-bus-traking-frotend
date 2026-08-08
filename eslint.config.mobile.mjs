import { defineConfig, globalIgnores } from "eslint/config";
import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";
import noComments from "./tools/eslint-rules/no-comments.mjs";

const eslintConfig = defineConfig([
  globalIgnores(["node_modules/**", ".expo/**", "dist/**", "web/**", "packages/**"]),
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["src/**/*.{ts,tsx}"],
    plugins: {
      "react-hooks": reactHooks,
      local: { rules: { "no-comments": noComments } },
    },
    rules: {
      "local/no-comments": "error",
      ...reactHooks.configs.recommended.rules,
      "react-hooks/refs": "warn",
      "react-hooks/set-state-in-effect": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  {
    files: ["src/**/__tests__/**/*.{ts,tsx}"],
    rules: {
      "local/no-comments": "off",
    },
  },
]);

export default eslintConfig;
