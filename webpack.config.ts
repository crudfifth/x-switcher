import path from "node:path";

module.exports = {
  entry: {
    popup: "./src/popup.ts",
    background: "./src/background.ts"
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "[name].js"
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: "ts-loader",
        exclude: /node_modules/
      },
      {
        test: /\.haml$/,
        use: "haml-loader"
      },
      {
        test: /\.less$/,
        use: ["style-loader", "css-loader", "less-loader"]
      }
    ]
  },
  resolve: {
    extensions: [".ts", ".js", ".haml", ".less"]
  }
};
