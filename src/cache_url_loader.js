import { load, toArr } from './util/common.js'

export class CacheUrlLoader {
   constructor(onUpdate = null, is_json_expected = true) {
      this.is_json_expected = is_json_expected
      this.use_cache = true
      this.cache = {};
      this.onUpdate = onUpdate
   }

   async load(url) {
      if (this.use_cache && this.cache[url]) return this.cache[url]

      if (!this.use_cache)
         return await this._loadAndCache(url)

      let data = await localStorage.getItem(url);

      if (!data)
         return await this._loadAndCache(url)

      // return data from localStorage
      // but load async and check if data updated
      // set is_updated, call onUpdate
      this._loadAndCache(url, data)
      return this.convertData(data)
   }

   convertData(data) {
      if (!this.is_json_expected)
         return data
      return JSON.parse(data);
   }

   async _loadAndCache(url, known_data = null) {
      let data = await load(url);
      localStorage.setItem(url, data);

      if (known_data && known_data !== data && this.onUpdate) {
         this.onUpdate(url)
      }
      data = this.convertData(data)
      this.cache[url] = data

      return data
   }

   // CacheUrlLoader don't catch errors on load
   // By default app would crash
   // If error appeared on processing loaded data, this function should be called
   // Cause wrong data cached and would returned on page reloading
   // It would always returned cause app crash and not overriding new data
   async onError(urls = null) {
      if (!urls)
         urls = Object.keys(this.cache)
      urls = toArr(urls)
      for (const url of urls) {
         localStorage.removeItem(url);
         console.log(`storage with key "${url}" removed`);
         delete this.cache[url]
      }
   }
}