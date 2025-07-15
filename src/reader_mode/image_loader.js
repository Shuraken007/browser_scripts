import { CacheUrlLoader } from "../cache_url_loader.js"
import { IntervalRunner } from './interval_runner.js'
import { types, get_type, rnd_from_arr, rnd_key_from_obj, obj_true_length, are_obj_equal, delay, isImage, isUrl } from '../util/common.js'
import { sessionFields } from './sync_session.js'
// wallpapers_url
// {
//    "__weights": {
//       "good": 1,
//          "https://w.wallhaven.cc/full/": 5,
//   },
//    "good": [
//       "https://ranobe.me/images/bg/4.jpg",
//       "https://www.royalroad.com/dist/img/new-bg-small.jpg",
//       "https://novelbin.com/img/bg.jpg",
//    ],
//       "https://w.wallhaven.cc/full/": [
//          "d6/wallhaven-d6y12l.jpg",
//          "3l/wallhaven-3lepy9.jpg",
//          "l8/wallhaven-l8x1pr.jpg",
//          ...
//   ]
// }

// wallpapers config
// {
//    "url": "https://api.npoint.io/c46ad28bf0fafa87d295",
//    "likes_weight_pct": 20,
//    "update_bg_img_time_min": 5,
//    "next_images_preload": 10,
//    "prev_images_remember": 10,
//    "max_preload_images_same_time": 4,
// },

class RndImgUrlGetter {
   constructor(config, session) {
      this.cache_url_loader = new CacheUrlLoader(async () => { await this.init_promise; this.init_promise = this.init() })
      this.config = config
      this.session = session
      this.wallpapers = null
      this.weights = null
      this.pairs_sorted_by_weights = null
      this.init_promise = this.init()
   }

   async init() {
      this.wallpapers = await this.cache_url_loader.load(this.config.url)
      await this.prepare_wallpapers()
      this.calculate_weights()
   }

   async onReload(config) {
      if (are_obj_equal(this.config, config))
         return
      await this.init_promise
      if (config.url === this.config.url)
         return
      this.config = config
      this.init_promise = this.init()
   }

   onError() {
      this.cache_url_loader.onError()
   }

   async prepare_wallpapers() {
      this.weights = this.wallpapers.__weights || {}
      delete this.wallpapers.__weights
      let likes = await this.session.get(sessionFields.likes)
      let dislikes = await this.session.get(sessionFields.dislikes)
      for (const k of Object.keys(this.wallpapers)) {
         let value_as_hash = {}
         for (let item of this.wallpapers[k]) {
            if (isUrl(k))
               item = k + item
            value_as_hash[item] = (likes[item] || dislikes[item]) ? false : true
         }
         this.wallpapers[k] = value_as_hash
      }
   }

   calculate_weights() {
      let total_weight = 0
      for (let [k, weight] of Object.entries(this.weights)) {
         if (!this.wallpapers[k]) {
            console.log(`__weights in wallpaper config have key ${k} but no such key in wallpapers`)
            delete this.weights[k]
            continue
         }

         if (obj_true_length(this.wallpapers[k]) === 0)
            continue

         total_weight += weight
      }

      if (total_weight > 100) {
         console.log(`summ of __weights in wallpapers > 100%, ignore user weights, use even method`)
         this.weights = {}
         total_weight = 0
      }

      let rest_weight = 100 - total_weight
      if (rest_weight === 0) return

      let rest_total_elements = 0
      for (let [k, v] of Object.entries(this.wallpapers)) {
         if (this.weights[k]) continue
         rest_total_elements += obj_true_length(v)
      }

      for (let [k, v] of Object.entries(this.wallpapers)) {
         if (this.weights[k]) {
            this.weights[k] = this.weights[k] / 100
            continue
         }
         this.weights[k] = obj_true_length(v) / rest_total_elements * rest_weight / 100
      }
      this.pairs_sorted_by_weights =
         Object.entries(this.weights).sort(([, a], [, b]) => b - a)
      // console.log(this.weights)
   }

   get_rnd_key_by_weights(rnd) {
      let last_pair = this.pairs_sorted_by_weights[0]
      for (let pair of this.pairs_sorted_by_weights) {
         if (pair[1] > rnd)
            return last_pair[0]
         last_pair = pair
      }
      return last_pair[0]
   }

   async get() {
      await this.init_promise

      let rnd = Math.random()
      // first attempt to return smth from likes
      let likes = await this.session.get(sessionFields.likes)
      let likes_arr = Object.keys(likes)
      if (likes_arr.length > 0 && rnd < this.config.likes_weight_pct / 100) {
         let res = rnd_from_arr(likes_arr)
         // console.log(`like_arr: ${res}`)
         return res
      }

      // second attempt - return from loaded wallpapers
      let rnd_key = this.get_rnd_key_by_weights(rnd)
      let res = rnd_key_from_obj(this.wallpapers[rnd_key])
      // console.log(`normal: ${res}`)
      return res
   }
}

const ILStorageKeys = {
   arr: 'userscript_ImageLoader_arr',
   pointer: 'userscript_ImageLoader_pointer',
}

export class ImageLoader {
   constructor({ config, onUpdate = null, session, preload_img_interval_min = 15 }) {
      this.config = config
      this.onUpdate = onUpdate
      this.on = false

      this.pointer = 0
      this.images = []
      this.known_urls = []
      this.loading_images = 0
      this.image_load_error_chain = 0
      this.max_image_load_error_chain = 15

      this.img_url_getter = new RndImgUrlGetter(config, session)
      this.preload_interval_runner = new IntervalRunner({
         name: 'image_loader_preload_img',
         interval_min: preload_img_interval_min,
         callback: () => { this.preload_images() }
      })
      this.next_interval_runner = new IntervalRunner({
         name: 'image_loader_next',
         interval_min: this.config.update_bg_img_time_min,
         callback: () => { this.next() }
      })

      this.are_images_restored = false
   }

   async run() {
      this.on = true

      if (!this.are_images_restored)
         await this.restore_images()

      this.preload_images()
      this.preload_interval_runner.run()
      this.next_interval_runner.run()
   }

   stop() {
      this.on = false
      this.preload_interval_runner.stop()
      this.next_interval_runner.stop()
   }

   async onReload(config) {
      if (are_obj_equal(this.config, config))
         return
      this.config = config
      await this.img_url_getter.onReload(this.config)
      this.next_interval_runner.onReload({ interval_min: this.config.update_bg_img_time_min })
   }

   onError() {
      localStorage.removeItem(ILStorageKeys.arr)
      localStorage.removeItem(ILStorageKeys.pointer)
      this.img_url_getter.onError()
   }

   async restore_images() {
      let [pointer, urls] = this.restore_urls()
      this.known_urls.concat(urls)
      if (urls.length === 0) return
      // first image priority
      this.set_pointer(pointer)
      this.load_image(pointer, urls[pointer])
      // console.log(`>${pointer} pointer`)
      await delay(1000)
      for (let i = 0; i < urls.length; i++) {
         if (i === pointer) continue
         this.load_image(i, urls[i])
      }
      // console.log('restored')
      if (urls.length > 0)
         this.are_images_restored = true
   }

   restore_urls() {
      let arr_data = localStorage.getItem(ILStorageKeys.arr) || '[]'
      let arr = JSON.parse(arr_data)
      let pointer = localStorage.getItem(ILStorageKeys.pointer) || 0
      pointer = Number(pointer)
      if (pointer >= arr.length)
         pointer = Math.max(0, arr.length - 1)

      return [pointer, arr]
   }

   on_image_load(image, i) {
      // console.log(`+${i}`)
      this.loading_images -= 1
      this.image_load_error_chain = 0
      this.images[i] = image
      // console.log(this.images)
      if (this.loading_images === 0)
         this.save()
      if (this.pointer !== i) return
      if (!this.onUpdate) return
      this.onUpdate(image)
   }

   async on_image_error(image, i) {
      // console.log(`-${i}`)
      this.loading_images -= 1
      this.image_load_error_chain += 1
      if (this.image_load_error_chain >= this.max_image_load_error_chain) {
         this.stop()
         console.log(`smth gone wrong on loading images, ${this.image_load_error_chain} errors in a row`)
         return
      }
      let urls = await this.get_new_urls(1)
      this.load_image(i, urls[0])
      // console.log(`error on load ${image.src} ; try reload ${urls[0]} ; ${i}`)
   }

   load_image(i, url) {
      const image = new Image();
      image.addEventListener('load', () => { this.on_image_load(image, i) });
      image.addEventListener('error', async () => { await this.on_image_error(image, i) });
      image.src = url;
      this.loading_images += 1
   }

   async wait_images_load(timeout = 10000) {
      let start_wait = Date.now()
      while (Date.now() - start_wait < timeout) {
         if (this.loading_images === 0) return
         await delay(1000)
      }
      this.loading_images = 0
      console.log('timeout on waiting images, smth gone wrong')
   }

   already_have_url(url) {
      if (this.known_urls.includes(url))
         return true
      return false
   }

   async get_new_urls(n) {
      let urls = []
      let i = 0
      while (urls.length < n) {
         let url = await this.img_url_getter.get()
         if (this.already_have_url(url)) continue
         urls.push(url)
         this.known_urls.push(url)
         i++
         if (i > 100) {
            console.log(`smth gone wrong, trying get image urls ${i} times`)
            break;
         }
      }
      return urls
   }

   have_images() {
      return this.images.filter(e => e).length + this.loading_images
   }

   async preload_images() {
      let have_images = this.have_images()
      let preloaded_n = have_images - this.pointer
      if (!preloaded_n == 0)
         preloaded_n -= 1
      let required_n = this.config.next_images_preload - preloaded_n
      if (required_n <= 0)
         return
      let urls = await this.get_new_urls(required_n)
      // first image priority
      if (!this.are_images_restored) {
         // console.log(`>${this.pointer} pointer`)
         this.load_image(this.pointer, urls[0])
         await delay(1000)
      }
      for (let i = 0; i < urls.length; i++) {
         if (have_images + i === this.pointer) continue
         // console.log(`>${have_images + i}`)
         this.load_image(have_images + i, urls[i])
      }
   }

   save() {
      let i_start = Math.max(this.pointer - this.config.prev_images_remember, 0)
      let i_end = Math.min(this.images.length - 1, this.pointer + this.config.next_images_preload)

      let img_url_arr = this.images.slice(i_start, i_end + 1).filter(e => e).map(image => image.src)
      // console.log({ save: 'save', i_start: i_start, i_end: i_end, img_len: this.images.length, new_len: img_url_arr.length, new_arr: img_url_arr })
      let arr_img_data = JSON.stringify(img_url_arr)
      localStorage.setItem(ILStorageKeys.arr, arr_img_data)
      localStorage.setItem(ILStorageKeys.pointer, this.pointer - i_start)
   }

   set_pointer(i) {
      this.pointer = i
      let i_start = Math.max(this.pointer - this.config.prev_images_remember, 0)
      localStorage.setItem(ILStorageKeys.pointer, this.pointer - i_start)
   }

   async next() {
      if (this.pointer === this.images.length - 1)
         await this.preload_images()
      this.set_pointer(this.pointer + 1)
      this.save()
      if (!this.onUpdate) return
      this.onUpdate(this.images[this.pointer])
   }

   async prev() {
      if (this.pointer === 0)
         return
      if (!this.images[this.pointer - 1])
         await this.preload_images()
      this.set_pointer(this.pointer - 1)
      if (!this.onUpdate)
         return
      this.onUpdate(this.images[this.pointer])
   }

   is_on() {
      return this.on
   }
}