import path from 'path';
import fs from 'fs';
import RawSource from 'webpack-sources/lib/RawSource.js';

export class HeadInsert {
   constructor(source_directory) {
      this.src = source_directory
   }

   apply(compilation) {
      compilation.hooks.compilation.tap("HeadInsert", (compilation) => {
         compilation.hooks.afterOptimizeAssets.tap(
            {
               name: "HeadInsert",
               stage: compilation.PROCESS_ASSETS_STAGE_DEV_TOOL
            },
            async (assets) => { this.add_meta(assets, compilation) }
         );
      });
   }

   add_meta(assets, compilation) {
      for (let i in assets) {
         const asset = compilation.getAsset(i);  // <- standardized version of asset object
         console.log(asset.name)
         const source = asset.source.source(); // <- standardized way of getting asset source

         let dir_by_asset = asset.name.replace('_min', '')

         let dir_name = path.parse(dir_by_asset).name
         let meta = path.resolve(this.src, dir_name, 'meta.js')

         let content = ""

         try { content = fs.readFileSync(meta).toString() } catch (err) { console.log(err) }

         if (!content) return

         let new_content;
         if (content.includes('SCRIPT_BODY'))
            new_content = content.replace('SCRIPT_BODY', source)
         else
            new_content = content + "\n\n" + source;

         compilation.updateAsset(
            i,
            new RawSource(new_content)
         );
      }
   }
}

export class ConfigInsert {
   load_config(dir_path, configs) {
      let json_config = {};
      for (const config of configs) {
         let config_path = path.resolve(dir_path, config)
         if (!fs.existsSync(config_path)) continue
         json_config = JSON.parse(fs.readFileSync(config_path).toString())
         break
      }
      return json_config
   }

   constructor(dir_path, configs, known_tokens) {
      this.known_tokens = known_tokens
      this.config = this.load_config(dir_path, configs)
   }

   apply(compilation) {
      compilation.hooks.compilation.tap("ConfigInsert", (compilation) => {
         compilation.hooks.afterOptimizeAssets.tap(
            {
               name: "ConfigInsert",
               stage: compilation.PROCESS_ASSETS_STAGE_DEV_TOOL
            },
            async (assets) => { this.insert_tokens(assets, compilation) }
         );
      });
   }

   BOOK_INCLUDE_HTTP(config_val) {
      let res = "\n"
      for (const val of config_val) {
         res += `// @include ${val}\n`
      }
      return res
   }
   SHOP_INCLUDE_HTTP(config_val) {
      let res = "\n"
      for (const val of config_val) {
         res += `// @include ${val}\n`
      }
      return res
   }

   insert_tokens(assets, compilation) {
      for (let i in assets) {
         const asset = compilation.getAsset(i);  // <- standardized version of asset object
         // console.log(asset.name)
         const source = asset.source.source(); // <- standardized way of getting asset source
         let new_source = source

         for (const token of this.known_tokens) {
            if (!source.includes(token)) continue
            let replacement = this.config[token] || ""

            if (this.config[token] !== null && this[token]) {
               replacement = this[token](this.config[token])
            }
            new_source = new_source.replace(token, `${replacement}`)
         }

         if (new_source === source) return
         compilation.updateAsset(
            i,
            new RawSource(new_source)
         );
      }
   }
}