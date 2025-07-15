import path from 'path';
import { HeadInsert, ConfigInsert } from "./dev/plugins.js"
import TerserPlugin from "terser-webpack-plugin";

import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let config = {
   entry: {
      cleaner: './src/cleaner/main.js',
      reader_mode: './src/reader_mode/main.js',
      word_text_replace: './src/word_text_replace/main.js',
      kakao_saver: './src/kakao_saver/main.js',
      kakao_saver_min: './src/kakao_saver/main.js',
      simple_mmo: './src/simple_mmo/main.js',
      kittens_game: './src/kittens_game/main.js',
      shop_bot: './src/shop_bot/main.js',
      test: './src/test/main.js',
   },
   output: {
      filename: '[name].js',
      path: path.resolve(__dirname, 'dist'),
      clean: true,
   },
   plugins: [
      new HeadInsert(path.resolve(__dirname, 'src')),
      new ConfigInsert(
         __dirname,
         ['config.jsonc', 'config_example.jsonc'],
         [
            'GIST_TOKEN', 'GIST_ID', 'GIST_FILE',
            'BOOK_INCLUDE_HTTP',
            'SHOP_INCLUDE_HTTP',
            'READER_MODE_CONFIG_URL',
            'CLEANER_CONFIG_URL',
            'WORD_TEXT_REPLACE_CONFIG_URL',
            'SHOP_BOT_CONFIG_URL',
         ]
      ),
   ],
   module: {
      rules: [
         {
            exclude: /(node_modules)/,
            test: /\.css$/i,
            use: ['style-loader', 'css-loader'],
         },
      ],
   },
   optimization: {
      minimize: true,
      minimizer: [
         (compiler) => {
            new TerserPlugin({
               include: /_min\.js$/,
               terserOptions: {
                  format: {
                     comments: false
                  }
               },
               extractComments: false
            }).apply(compiler);
         }
      ]
   }
};

export default config;