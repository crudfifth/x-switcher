const path = require("node:path");
const CopyPlugin = require("copy-webpack-plugin");
const fs = require("node:fs");
const haml = require("haml");
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = (env, argv) => {
  const isDev = argv.mode === "development";

  // HAML -> HTML に変換対象のファイル一覧
  const hamlEntries = [{
      input: "src/popup/popup.haml",
      output: "dist/popup.html"
    },
    {
      input: "src/settings/settings.haml",
      output: "dist/settings.html"
    }
  ];

  // HAMLをHTMLに変換する関数
  const convertHamlToHtml = () => {
    for (const {
        input,
        output
      } of hamlEntries) {
      const hamlContent = fs.readFileSync(input, "utf8");
      const htmlContent = haml.render(hamlContent);
      fs.writeFileSync(output, htmlContent);
      console.log(`✅ ${input} → ${output} に変換されました`);
    }
  };

  // 開発モードではHAMLファイルの変更を監視
  if (isDev) {
    for (const {
        input
      } of hamlEntries) {
      fs.watchFile(input, {
        interval: 500
      }, convertHamlToHtml);
    }
  } else {
    convertHamlToHtml();
  }

  return {
    mode: isDev ? "development" : "production",
    entry: {
      popup: "./src/popup/index.ts",
      settings: "./src/settings/index.ts",
      background: "./src/background/index.ts",
      content: "./src/content/fetchUsername.ts",
      styles: "./src/popup/styles.less",
    },
    output: {
      path: path.resolve(__dirname, "dist"),
      filename: "[name].js",
    },
    module: {
      rules: [{
          test: /\.ts$/,
          use: "ts-loader",
          exclude: /node_modules/,
        },
        {
          test: /\.less$/,
          use: [MiniCssExtractPlugin.loader, "css-loader", "less-loader"],
        },
      ],
    },
    plugins: [
      new MiniCssExtractPlugin({
        filename: "styles.css"
      }),
      new CopyPlugin({
        patterns: [{
            from: "src/assets/icon.png",
            to: "icon.png"
          },
          {
            from: "src/assets/manifest.json",
            to: "manifest.json"
          },
        ],
      }),
    ],
    resolve: {
      extensions: [".ts", ".js", ".less"],
    },
    devtool: isDev ? "source-map" : false,
    watch: isDev,
  };
};
