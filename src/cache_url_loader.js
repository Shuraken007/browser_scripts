import { load, toArr } from './util.js'

export class CacheUrlLoader {
   constructor(onUpdateEvent = null, is_json_expected = true) {
      this.is_json_expected = is_json_expected
      this.use_cache = true
      this.cache = {};
      this.is_updated = false;
      this.onUpdateEvent = onUpdateEvent
      this.load_promises = []
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
      // set is_updated, call onUpdateEvent
      this.load_promises.push(this._loadAndCache(url, data))
      return this.convertData(data)
   }

   convertData(data) {
      if (!this.is_json_expected)
         return data
      return JSON.parse(data);
   }

   async _loadAndCache(url, known_data = null) {
      let data = await load(url);
      if (known_data && known_data !== data) {
         this.is_updated = true
         this._onUpdate(url)
      }
      localStorage.setItem(url, data);
      data = this.convertData(data)
      this.cache[url] = data

      return data
   }

   async _onUpdate(url) {
      if (!this.onUpdateEvent) return
      this.is_updated = false
      this.load_promises = []
      this.onUpdateEvent(url)
   }

   async getIsUpdateAndReset() {
      await Promise.all(this.load_promises)
      this.load_promises = []

      let res = this.is_updated
      this.is_updated = false
      return res
   }

   // CacheUrlLoader don't catch errors on load
   // By default app would crash
   // If error appeared on processing loaded data, this function should be called
   // Cause wrong data cached and would returned on page reloading
   // It would always returned cause app crash and not overriding new data
   resetOnError(urls = null) {
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