import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["**/dist/", "**/node_modules/", "eslint.config.js"] },
  ...tseslint.configs.strictTypeChecked,
  {
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: import.meta.dirname } },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/ban-ts-comment": ["error", { "ts-expect-error": "allow-with-description" }],
    },
  },
  {
    files: ["packages/server/**"],
    rules: { "no-restricted-imports": ["error", { patterns: ["@smt/web", "**/web/**"] }] },
  },
  {
    files: ["packages/web/**"],
    rules: { "no-restricted-imports": ["error", { patterns: ["@smt/server", "**/server/**"] }] },
  },
  {
    files: ["packages/shared/**"],
    rules: { "no-restricted-imports": ["error", { patterns: ["@smt/server", "@smt/web", "**/server/**", "**/web/**"] }] },
  },
);
