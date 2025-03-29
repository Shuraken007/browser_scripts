import { CacheUrlLoader } from "../cache_url_loader.js"
import * as util from '../util/common.js'

const known_keys = {
   urls: '__urls',
   include: '__include',
   level: '__level',
   config: '__config',
   contains: function (key) {
      return Object.values(this).includes(key);
   }
};

const ReplacementConverter = {
   replacer: function (_, value) {
      if (value instanceof RegExp)
         return ("__REGEXP " + value.toString());
      else
         return value;
   },
   reviver: function (_, value) {
      if (value.toString().indexOf("__REGEXP ") == 0) {
         let m = value.split("__REGEXP ")[1]
         return util.getRegFromString(m, false)
      } else
         return value;
   }
}

const storage_replacements = 'saved_replacements';

export class ReplacementBuilder {
   constructor({ replacements_url, chinese_convertor, level, onUpdate = null }) {
      this.replacements_url = replacements_url
      this.chinese_convertor = chinese_convertor
      this.level = level
      this.onUpdate = onUpdate

      this.cache_url_loader = new CacheUrlLoader(onUpdate);
      this.is_simple_chinese = false
      this.use_cache = true
   }

   async tryLoadFromCache() {
      let replacements
      if (!this.use_cache) return null
      replacements = await localStorage.getItem(storage_replacements);
      if (!replacements) return null
      return JSON.parse(replacements, ReplacementConverter.reviver)
   }

   async run() {
      let replacements = await this.tryLoadFromCache(this.replacements_url)
      if (replacements) return replacements

      let json = await this.cache_url_loader.load(this.replacements_url);
      json = await this.loadIncludesAndConfig(json)
      return await this.build_replacements(json);
   }

   async loadIncludesAndConfig(node) {
      let includes = node[known_keys.include];
      if (includes) {
         for (const [include_alias, url] of Object.entries(includes)) {
            await this.addUrlInclude(url, include_alias, node);
         }
      }
      this.processConfig(node)
      for (const [key, child] of Object.entries(node)) {
         if (known_keys.contains(key)) continue;
         if (util.isDict(child))
            await this.loadIncludesAndConfig(child);
      }
      return node
   }

   async addUrlInclude(url, include_alias, root) {
      let json;
      if (!this.isValidHttpUrl(url)) return
      try {
         json = await this.cache_url_loader.load(url);
         let urls = json[known_keys.urls];
         if (urls && await this.allUrlsOtherHostname(urls))
            return
      } catch (err) {
         // ignore error on invalid included json
         console.log(`error on loading url include ${url}`)
         console.log(err)
         this.cache_url_loader.onError(url)
         return;
      }
      if (!json) return;
      root[include_alias] = json;
   }

   isValidHttpUrl(string) {
      let url;

      try {
         url = new URL(string);
      } catch (_) {
         return false;
      }

      return url.protocol === "http:" || url.protocol === "https:";
   }

   // exclude if all url_patterns converted to urls (only * used https://hostname/page/chap*)
   // also all hostnames different from current
   async allUrlsOtherHostname(url_patterns) {
      let res = true
      let cur_hostname = new URL(window.location.href).hostname
      for (const url_pattern of url_patterns) {
         try {
            let hostname = new URL(url_pattern).hostname
            // console.log(`${this.hostname} -> ${hostname}`)
            if (hostname === cur_hostname)
               return false
         } catch (err) { return false }
      }
      return res
   }

   processConfig(node) {
      let config = node[known_keys.config];
      if (!config) return
      if (config.simple_chinese !== null) {
         this.is_simple_chinese = config.simple_chinese
      }
   }

   save(replacements) {
      let replacements_as_str = JSON.stringify(replacements, ReplacementConverter.replacer)
      localStorage.setItem(storage_replacements, replacements_as_str);
   }

   async build_replacements(json) {
      let known_nodes = {};
      this.collect_names(json, known_nodes);
      let replacements_by_priority_level = {};
      await this.collect_replacements(
         json,
         replacements_by_priority_level,
         known_nodes,
         this.level
      );
      let replacements = this.union_replacements_by_level(replacements_by_priority_level);
      if (replacements && replacements.size > 0) {
         this.save(replacements)
      }
      return replacements;
   }

   collect_names(node, known_nodes) {
      for (const [k, v] of Object.entries(node)) {
         if (!util.isDict(v)) continue;
         this.collect_names(v, known_nodes);
         if (known_nodes[k] != null) {
            known_nodes[k] = [known_nodes[k]]
            known_nodes[k].push(v)
         } else {
            known_nodes[k] = v
         }
      }
   }

   check_url(pattern_arr) {
      if (!util.isArray(pattern_arr)) {
         throw new Error(`field ${known_keys.urls} exptect to be Array, got ${obj_type}`);
      }
      for (const url_pattern of pattern_arr) {
         let url_regex = util.urlToRegex(url_pattern);
         if (!url_regex.test(window.location.href)) continue;
         return true;
      }
      return false;
   }

   validate_lvl(lvl, root) {
      let lvl_type = util.get_type(lvl);
      if (!util.isInt(lvl)) {
         console.log(`field ${known_keys.level} must be number, got ${lvl_type}
            root: ${root}`);
         return false;
      }
      return true;
   }

   isKnownInclude(include, known_nodes, root) {
      if (include.includes('http')) return false;
      if (!known_nodes[include]) {
         console.log(`include '${include}' not founded
            root: ${root}`);
         return false;
      }
      if (root.hasOwnProperty(include)) {
         console.log(`current node already has key '${include}'
            root: ${root}`);
         return false;
      }
      return true;
   }

   async add_known_include(root, include_alias, include_node_name, known_nodes) {
      let data;
      if (!this.isKnownInclude(include_node_name, known_nodes, root)) return
      data = known_nodes[include_node_name];
      if (util.isArray(data)) {
         console.log(`include ${include_node_name} has ${data.length} items, taking first`)
         data = data[0]
         console.log(data)
      }
      if (!data) return;
      root[include_alias] = data;
   }

   async collect_replacements(node, collection_by_lvl, known_nodes, priority_lvl, is_matched = false) {
      let urls = node[known_keys.urls];
      if (urls) {
         if (!this.check_url(urls)) {
            // console.log(urls)
            // console.log('failed')
            return;
         }
         is_matched = true;
      }
      let lvl = node[known_keys.level];
      if (lvl !== undefined) {
         if (this.validate_lvl(lvl, node)) priority_lvl = lvl;
      }
      let includes = node[known_keys.include];
      if (includes) {
         for (const [include_alias, include_node_name] of Object.entries(includes)) {
            await this.add_known_include(node, include_alias, include_node_name, known_nodes);
         }
      }
      for (const [k, v] of Object.entries(node)) {
         if (known_keys.contains(k)) continue;
         let val_type = util.get_type(v);
         if (val_type == util.types.Array) {
            await this.add_random_entity(k, v, collection_by_lvl, priority_lvl);
         } else if (val_type == util.types.Dict) {
            await this.collect_replacements(v, collection_by_lvl, known_nodes, priority_lvl, is_matched);
         } else if (val_type === util.types.String) {
            await this.add_basic_entity(k, v, collection_by_lvl, priority_lvl);
         }
      }
   }

   async add_random_entity(key, value, collection_by_lvl, priority_lvl) {
      if (util.get_type(value) != util.types.Array) {
         throw Error(
            `value expected to be Array, got ${util.get_type(value)}
            value: ${value}`
         );
      }
      if (this.is_simple_chinese) {
         key = await this.chinese_convertor.convert(key);
         for (let i = 0; i < value.length; i++)
            value[i] = await this.chinese_convertor.convert(value[i]);
      }
      key = util.tokenToRegex(key);
      this.add_replacement_to_collection(key, value, collection_by_lvl, priority_lvl);
   }

   async add_basic_entity(key, value, collection_by_lvl, priority_lvl) {
      if (util.get_type(value) != util.types.String) {
         throw Error(
            `value expected to be str, got ${util.get_type(value)}
            value: ${value}`
         );
      }
      if (this.is_simple_chinese) {
         key = await this.chinese_convertor.convert(key);
         value = await this.chinese_convertor.convert(value);
      }
      key = util.tokenToRegex(key);
      this.add_replacement_to_collection(key, value, collection_by_lvl, priority_lvl);
   }

   add_replacement_to_collection(key, value, collection_by_lvl, priority_lvl) {
      if (!collection_by_lvl.hasOwnProperty(priority_lvl)) {
         collection_by_lvl[priority_lvl] = [];
      }
      let collection_arr = collection_by_lvl[priority_lvl];

      for (let i = 0; i < collection_arr.length; i++) {
         let k = collection_arr[i][0];
         let k_as_str = k.toString().replace(/^\//, "").replace(/\/$/, "");
         let key_as_str = key.toString().replace(/^\//, "").replace(/\/\w*?$/, "");
         if (key_as_str == k_as_str) {
            console.log(`key: ${key} was added earlier, overriding`);
            // collection_arr.splice(i, 1);
            return
         }
         if (key_as_str.includes(k_as_str)) {
            // console.log(`replacement ${key} contains earlier added ${k}, moving up`);
            collection_arr.splice(i, 0, [key, value]);
            return;
         }
      }
      collection_arr.push([key, value]);
   }

   sort_str_keys_as_numbers(a, b) {
      let x = Number(a);
      let y = Number(b);
      if (x < y) return -1;
      if (x > y) return 1;
      return 0;
   }

   union_replacements_by_level(collection_by_lvl) {
      let replacements = [];

      let keys = Object.keys(collection_by_lvl);
      for (let key of keys.sort(this.sort_str_keys_as_numbers)) {
         replacements.push(...collection_by_lvl[key]);
      }
      return replacements;
   }

   onError() {
      console.log('removed storage_replacements')
      localStorage.removeItem(storage_replacements);
      this.cache_url_loader.onError()
   }

}