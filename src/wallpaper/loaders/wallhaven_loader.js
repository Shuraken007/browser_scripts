import { xml_fetch_with_retry } from '../../util/common.js';
import { WallHavenApi } from './wallhaven_api.js';
import { ImageSpec } from './common.js';
import { get_loader_storage } from "./common.js";
import { WallHavenStorage } from "./wallhaven_storage.js";
import { GmCache } from "../../util/gm_cache.js"

class ImageDetails {
   constructor(path, id, author, tags, categories, colors) {
      this.path = path
      this.id = id
      this.author = author
      this.tags = tags
      this.categories = categories
      this.colors = colors
   }

   toJSON() {
      return JSON.stringify({ path: this.path, id: this.id, author: this.author, tags: this.tags, categories: this.categories, colors: this.colors })
   }

   static fromJSON(str) {
      let json = JSON.parse(str)
      return new ImageDetails(json.path, json.id, json.author, json.tags, json.categories, json.colors)
   }
}

export class WallHavenLoader {
   constructor(common_storage, alias) {
      this.name = alias
      this.api = new WallHavenApi();

      this.storage = new WallHavenStorage(common_storage, alias)

      this.cache = new GmCache(
         {
            query1: [], // coarse first query
            query2: [], // filtered query by loading details
            details: {}, // cache for loaded details
         },
         'wallhaven_cache',
         15,
         (key, value) => this.restore_cache(key, value)
      )
      this.metrics_cache = new GmCache(
         { default: { min: -10, max: 10 } },
         'wallhaven_metric_cache',
         15,
      )

      this.viewed_ids = {}
      this.preload_size = 100
      this.init_awaiter = this.init()

      this.search()
   }

   async init() {
      await this.cache.get_init_awaiter()
      await this.metrics_cache.get_init_awaiter()
   }

   restore_cache(key, value) {
      if (typeof value !== 'object')
         return value

      switch (key) {
         case 'query1':
         case 'query2':
            let map_loader = { [this.name]: this }
            return value.map(x => ImageSpec.fromJSON(x, map_loader))
         case 'details':
            return Object.fromEntries(Object.entries(value).map(
               ([k, v]) => [k, ImageDetails.fromJSON(v)])
            )
      }
      return value
   }

   async get_image_spec() {
      let query = this.cache.query2
      if (query.length === 0)
         query = this.cache.query1
      if (query.length === 0) {
         await this.search()
      }
      let image_spec = query.shift();
      this.cache.save()
      if (query.length < this.preload_size / 2)
         this.search()
      return image_spec
   }

   is_item_skipped(item) {
      let id = item.id
      if (id in this.viewed_ids)
         return true;
      if (this.is_liked(id))
         return true;
      if (this.is_disliked(id))
         return true;
      return false;
   }

   is_full() {
      return this.cache.query2.length >= this.preload_size
   }

   async search(attempts = 3) {
      await this.init_awaiter
      if (this.is_full()) return
      let search_url = this.api.get_search_url();
      let i = 0
      let items = []
      while (items.length === 0 && i < attempts) {
         let resp_text = await xml_fetch_with_retry(search_url);
         let resp = JSON.parse(resp_text);
         items = resp.data.filter(item => !this.is_item_skipped(item));
         i++
         if (i === attempts) {
            console.log(`failed to load image after: ${attempts} tries
            url: ${search_url}
            `);
         }
      }
      for (let item of items) {
         let image_spec = new ImageSpec(item.path, item.id, this);
         this.cache.query1.push(image_spec);
         this.viewed_ids[item.id] = true;
      }
      this.run_detailed_search()
   }

   async run_detailed_search() {
      while (this.cache.query1.length) {
         let item_spec = this.cache.query1.pop()
         let details = await this.get_image_detailes_by_id(item_spec.id)
         let like_chance = this.get_like_chance(details)
         if (Math.random() > like_chance) {
            continue
         }

         this.cache.details[item_spec.id] = details
         this.cache.query2.push(item_spec)
         if (this.is_full()) break
      }
      await this.cache.save()
      if (!this.is_full()) {
         this.search()
      }
   }

   async get_image_detailes_by_id(id) {
      let details = this.cache.details[id]
      if (details)
         return details

      let url = this.api.get_info_url(id);
      let resp_text = await xml_fetch_with_retry(url);
      let data = JSON.parse(resp_text).data;
      let author = data.uploader.username
      let tags = data.tags.map(t => t.name)
      let categories = [...new Set(data.tags.map(t => t.category))]
      let colors = data.colors
      return new ImageDetails(data.path, data.id, author, tags, categories, colors)
   }

   async get_image_spec_by_id(id) {
      let details = await this.get_image_detailes_by_id(id)
      return new ImageSpec(details.path, details.id, this);
   }

   get_likes_length() {
      return this.storage.get_likes_length()
   }

   get_random_like() {
      let id = this.storage.get_random_like();
      return this.get_image_spec_by_id(id);
   }

   is_liked(image_spec) {
      return this.storage.is_liked(image_spec.id)
   }

   is_disliked(image_spec) {
      return this.storage.is_disliked(image_spec.id)
   }

   async like(image_spec, is_other_state) {
      let is_liked = this.is_liked(image_spec)
      let details = await this.get_image_detailes_by_id(image_spec.id)
      if (!is_liked && !is_other_state) {
         await this.storage.add(true, image_spec, details)
         return true
      } else if (is_liked && is_other_state) {
         await this.storage.remove(true, image_spec, details)
         return true
      }
      return false
   }

   async dislike(image_spec, is_other_state) {
      let is_disliked = this.is_disliked(image_spec)
      let details = await this.get_image_detailes_by_id(image_spec.id)
      if (!is_disliked && !is_other_state) {
         await this.storage.add(false, image_spec, details)
         return true
      } else if (is_disliked && is_other_state) {
         await this.storage.remove(false, image_spec, details)
         return true
      }
      return false
   }

   get_like_chance(details) {
      let metric_name = 'default'
      let metric_spec = this.metrics_cache[metric_name]
      let value = this.storage.get_metric(details)

      metric_spec.min = Math.min(metric_spec.min, value)
      metric_spec.max = Math.max(metric_spec.max, value)
      this.metrics_cache.save()

      let diff = metric_spec.max - metric_spec.min

      let chance = (value - metric_spec.min) / diff
      let default_chance = 0.1
      chance = Math.max(default_chance, chance)
      return chance
   }



   __clear() {
      this.cache.__clear()
      // this.storage.__clear()
   }
}