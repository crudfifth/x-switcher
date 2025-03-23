/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  // Node.js のAPIを使うような処理に向いた環境を指定
  testEnvironment: "node",

  // `.ts` や `.tsx` ファイルを ts-jest でトランスパイル
  transform: {
    "^.+\\.tsx?$": ["ts-jest", {}],
  },

  // テストファイルのパターンを指定（例: `*.spec.ts`, `*.test.ts`）
  testMatch: ["**/__tests__/**/*.(spec|test).ts"],

  // TypeScriptの設定を適用するパス（`tsconfig.json`の場所）
  globals: {
    "ts-jest": {
      tsconfig: "tsconfig.json",
    },
  },

  // カバレッジを測定したいときの対象ファイル
  collectCoverageFrom: ["src/**/*.{ts,tsx}", "!src/**/*.d.ts"],

  // node_modules 内は無視
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],

  // importエラーを避けるためのモジュール解決設定
  moduleFileExtensions: ["ts", "tsx", "js", "json", "node"],
};
