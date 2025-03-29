import { CacheUrlLoader } from "../cache_url_loader.js"
import { types, get_type } from "../util/common.js"

const rIsChinese = /\p{sc=Han}/u;

export class ChineseConvertor {
   constructor(url) {
      this.url = url
      this.map = null
      this.cache_url_loader = new CacheUrlLoader()
      this.on = false
   }

   async load() {
      if (!this.url) return
      this.map = await this.cache_url_loader.load(this.url)
      this.on = true
   }

   async convert(str) {
      if (!this.map)
         await this.load()
      if (!this.on)
         return
      let str_type = get_type(str)
      if (str_type === types.Null || types.Unknown) {
         throw new Error("no input");
      } else if (str_type !== types.String) {
         throw new Error("input is not string");
      } else if (!str.match(rIsChinese)) {
         return str;
      }
      let cls = this
      var new_str = str.replace(/\p{sc=Han}/ug, function (char) {
         return cls.map[char] || char;
      });
      // if (new_str != str) {
      //    console.log(`${str} -> ${new_str}`)
      // }
      return new_str;
   }
}