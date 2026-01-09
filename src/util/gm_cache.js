import { IntervalRunner } from '../util/interval_runner.js'
import { merge_obj } from './common.js'

const cache_handler = {
   get: (target, key) => {
      if (key in target)
         return target[key];

      return target.cache[key];
   },
   set: (target, key, value) => {
      if (key === 'cache') {
         return target.cache = value
      } else {
         return target.cache[key] = value;
      }
   },
   has(target, key) {
      return key in target.cache;
   },
   delete: (target, key) => {
      delete target.cache[key];
   }
}

export class GmCache {
   constructor(default_cache, name, delta_save_min, parse_call = null) {
      this.name = `gm_cache_${name}`
      this.parse_call = parse_call
      this.default_cache = default_cache || {}
      this.save_interval = new IntervalRunner({
         name: name,
         interval_min: delta_save_min,
         callback: () => { this.save() }
      })

      this.cache = {}
      this.init_awaiter = this.init()

      return new Proxy(this, cache_handler);
   }

   async init() {
      await this.load()
      this.save_interval.run()
   }

   get_init_awaiter() { return this.init_awaiter; }

   async save() {
      let data = JSON.stringify(this.cache)
      // console.log(`save ${this.name}`)
      await GM.setValue(this.name, data);
   }

   async load() {
      // console.log(`load ${this.name}`)
      let data = await GM.getValue(this.name) || "{}";
      // let data = "{}";
      let json = JSON.parse(data, this.parse_call)
      // console.log(json)
      this.cache = merge_obj(json, this.default_cache)
      // console.log(this.cache)
   }

   get() {
      return this.cache
   }

   set(json) {
      this.cache = json
   }

   __clear() {
      GM.deleteValue(this.name)
   }
}