import { CacheUrlLoader } from "../cache_url_loader.js"
import { IntervalRunner } from '../util/interval_runner.js'
import { types, get_type, rnd_from_arr, rnd_key_from_obj, obj_true_length, are_obj_equal, delay, isImage, isUrl, isArray, isNull, xml_fetch_with_retry } from '../util/common.js'
import { sessionFields } from './sync_session.js'
import { RndImgUrl } from '../wallpaper/rnd_img_url.js';
import { GmCache } from "../util/gm_cache.js";
import { ImageSetter } from './image_setter.js'
import { ImageSpec } from './loaders/common.js'

const ILStorageKeys = {
   arr: 'userscript_ImageLoader_arr',
   pre_arr: 'userscript_ImageLoader_pre_arr',
   pointer: 'userscript_ImageLoader_pointer',
}

class ImageLoaderCache {
   constructor(viewed_size, preload_size, img_url_getter) {
      this.viewed_size = viewed_size
      this.preload_size = preload_size
      this.img_url_getter = img_url_getter

      this.restored_image_specs = []
      this.restored_pointer = 0

      this.restored_preloaded_image_specs = []

      this.init_awaiter = this.init()
   }

   async init() {
      let data_str = await GM.getValue(ILStorageKeys.arr) || '[]'
      let image_specs = JSON.parse(data_str).map(
         item => ImageSpec.fromJSON(item, this.img_url_getter.loaders)
      )

      data_str = await GM.getValue(ILStorageKeys.pre_arr) || '[]'
      let pre_image_specs = JSON.parse(data_str).map(
         item => ImageSpec.fromJSON(item, this.img_url_getter.loaders)
      )

      let pointer = await GM.getValue(ILStorageKeys.pointer) || 0
      pointer = Number(pointer)

      this.restored_image_specs = image_specs
      this.restored_preloaded_image_specs = pre_image_specs
      this.remove_duplicates()

      this.restored_pointer = pointer
   }

   remove_duplicates() {
      let arr1 = this.restored_image_specs
      let arr2 = this.restored_preloaded_image_specs

      arr1 = arr1.filter(
         (y, i) => arr1.findIndex(x => x.id === y.id) == i
      )
      arr2 = arr2.filter(
         (y, i) => arr2.findIndex(x => x.id === y.id) == i
      )
      arr2 = arr2.filter(y => !arr1.some(x => x.id === y.id))

      this.restored_image_specs = arr1
      this.restored_preloaded_image_specs = arr2
   }

   get_pointer() {
      return this.restored_pointer
   }

   get_image_specs() {
      return this.restored_image_specs
   }

   get_preloaded_image_specs() {
      return this.restored_preloaded_image_specs
   }

   save_pointer(pointer) {
      let i = pointer
      let i_start = Math.max(i - this.viewed_size, 0)
      GM.setValue(ILStorageKeys.pointer, i - i_start)
   }

   save_image_specs(pointer, image_specs) {
      let i = pointer
      let i_start = Math.max(i - this.viewed_size, 0)
      let i_end = Math.min(image_specs.length - 1, i + this.preload_size)

      let imag_specs_as_str = JSON.stringify(image_specs.slice(i_start, i_end))
      GM.setValue(ILStorageKeys.arr, imag_specs_as_str)
      GM.setValue(ILStorageKeys.pointer, i - i_start)
   }

   save_preloaded_image_specs(image_specs) {
      let img_specs_as_str = JSON.stringify(image_specs)
      GM.setValue(ILStorageKeys.pre_arr, img_specs_as_str)
   }
}

class ImageSpecsLoader {
   constructor(size, img_url_getter, cache) {
      this.size = size
      this.img_url_getter = img_url_getter
      this.cache = cache
      this.image_specs = []
      this.known_image_specs = {}

      this.restore()
   }

   restore() {
      let known_image_specs = this.cache.get_image_specs()
      known_image_specs.forEach(item => this.known_image_specs[item.id] = true)
      this.image_specs = this.cache.get_preloaded_image_specs()
      this.image_specs.forEach(item => this.known_image_specs[item.id] = true)
   }

   is_skipped(image_spec) {
      return image_spec.id in this.known_image_specs
   }

   remove(image_spec) {
      let i = this.image_specs.findIndex(item => item.id === image_spec.id)
      this.image_specs.splice(i, 1);
   }

   async preload_one() {
      if (this.image_specs.length >= this.size)
         return
      let image_spec = await this.img_url_getter.get_image_spec()
      while (this.is_skipped(image_spec)) {
         image_spec = await this.img_url_getter.get_image_spec()
      }
      this.image_specs.push(image_spec)
      this.known_image_specs[image_spec.id] = true
   }

   async preload() {
      while (this.image_specs.length < this.size) {
         await this.preload_one()
      }
      this.cache.save_preloaded_image_specs(this.image_specs)
   }

   async get() {
      if (this.image_specs.length === 0)
         await this.preload_one()
      let image_spec = this.image_specs.shift()
      this.preload()
      return image_spec
   }

   get_all() {
      let copy_arr = this.image_specs
      this.image_specs = []
      this.preload()
      return copy_arr
   }
}

class ImagePreloader {
   constructor(max_preload_images_same_time, onLoad, onLoadCancel) {
      this.images = {}
      this.image_spec_query = []

      this.errors = {}
      this.max_errors_allowed = 2
      this.errors_chain_c = 0
      this.allowed_errors_chain_c = 4
      this.chain_last_time = 0
      this.chain_alive = 2000

      this.load_n = max_preload_images_same_time
      this.load_c = 0

      this.onLoad = onLoad
      this.onLoadCancel = onLoadCancel

      this.on = false
   }

   get(image_spec) {
      return this.images[image_spec.id]
   }

   push(image_spec) {
      this.image_spec_query.push(image_spec)
      this.run()
   }

   push_array(image_specs) {
      this.image_spec_query.push(...image_specs)
      this.run()
   }

   async run() {
      if (this.on)
         return
      this.on = true

      while (this.image_spec_query.length) {
         if (this.load_c >= this.load_n) {
            await delay(1000)
            continue
         }
         // if (this.errors_chain_c >= this.allowed_errors_chain_c) {
         //    console.log(`pause after ${this.errors_chain_c} errors`)
         //    await delay(10000)
         //    this.errors_chain_c = 0
         // }
         let image_spec = this.image_spec_query.shift()
         this.load_image(image_spec)
         await delay(100)
      }
      this.on = false
   }

   load_image(image_spec) {
      const image = new Image();
      image.addEventListener('load', () => { this.on_image_load(image, image_spec) });
      image.addEventListener('error', () => { this.on_image_error(image_spec) });
      image.src = image_spec.url;
      this.load_c += 1
   }

   on_image_load(image, image_spec) {
      this.load_c -= 1
      this.images[image_spec.id] = image
      this.try_reset_error_chain()
      if (this.errors[image_spec.id]) {
         // console.log(`image ${image_spec.url} loaded from ${this.errors[image_spec.id]} attempt`)
         delete this.errors[image_spec.id]
      }
      this.onLoad(image_spec)
   }

   try_reset_error_chain() {
      if (this.errors_chain_c === 0)
         return
      if (Date.now() - this.chain_last_time < this.chain_alive)
         return
      this.errors_chain_c = 0
   }


   async on_image_error(image_spec) {
      this.load_c -= 1
      this.errors_chain_c += 1
      this.chain_last_time = Date.now()
      let id = image_spec.id
      this.errors[id] = (this.errors[id] || 0) + 1

      await xml_fetch_with_retry(image_spec.url) // try load via xml_fetch_with_retry, data would be cached

      if (this.errors[id] >= this.max_errors_allowed) {
         console.log(`image ${image_spec.url} not loaded on ${this.errors[id]} attempt`)
         delete this.errors[id]
         this.onLoadCancel(image_spec)
      } else {
         this.push(image_spec)
      }
   }
}

class ImageLoaderManager {
   constructor(config, image_setter, img_url_getter) {
      this.config = config
      this.image_specs = []
      this.pointer = 0
      this.max_pointer = 0

      this.image_setter = image_setter
      this.img_url_getter = img_url_getter
      this.cache = new ImageLoaderCache(config.prev_images_remember, config.next_images_preload, img_url_getter)
      this.image_specs_loader = null

      let onLoad = (image_spec) => { this.onLoad(image_spec) }
      let onLoadCancel = (image_spec) => { this.onLoadCancel(image_spec) }
      this.is_any_image_loaded = false
      this.image_preloader = new ImagePreloader(
         config.max_preload_images_same_time,
         onLoad, onLoadCancel
      )

      this.is_next_waiting = false
      this.is_prev_waiting = false

      this.onImageSet = null

      this.init_awaiter = this.init()
   }

   async init() {
      await this.cache.init_awaiter
      this.image_specs = this.cache.get_image_specs()
      this.pointer = this.cache.get_pointer()
      this.max_pointer = this.pointer
      this.image_specs_loader = new ImageSpecsLoader(
         this.config.next_images_preload, this.img_url_getter, this.cache
      )
      this.image_specs_loader.preload()
      this.init_preload()
   }

   try_set_image(image_spec) {
      let image = this.image_preloader.get(image_spec)
      if (!image) return false
      this.image_setter.set(image)
      let new_pointer = this.get_pointer_by_image_spec(image_spec)
      this.pointer = new_pointer
      this.max_pointer = Math.max(this.max_pointer, new_pointer)
      this.cache.save_image_specs(this.pointer, this.image_specs)

      this.onImageSet(image_spec)

      return true
   }

   onLoad(image_spec) {
      let is_image_set = false
      if (!this.is_any_image_loaded) {
         is_image_set = true
         this.is_any_image_loaded = true
      }
      let new_pointer = this.get_pointer_by_image_spec(image_spec)
      if (this.is_next_waiting && new_pointer > this.pointer) {
         is_image_set = true
         this.is_next_waiting = false
      } else if (this.is_prev_waiting && new_pointer < this.pointer) {
         is_image_set = true
         this.is_prev_waiting = false
      }

      if (!is_image_set) return

      this.try_set_image(image_spec)
   }

   onLoadCancel(image_spec) {
      if (this.image_specs.length === 0)
         return
      let i = this.get_pointer_by_image_spec(image_spec)
      this.image_specs.splice(i, 1);
      if (this.pointer > i)
         this.pointer--
      if (this.max_pointer > i)
         this.max_pointer--

      this.cache.save_image_specs(this.pointer, this.image_specs)

   }

   get_current_image_spec() {
      return this.image_specs[this.pointer]
   }

   get_pointer_by_image_spec(image_spec) {
      let pointer = this.image_specs.findIndex(x => x.id === image_spec.id)
      return pointer
   }

   async init_preload() {
      let preloaded = this.image_specs.slice(this.pointer)
      this.image_preloader.push_array(preloaded)
      let one = await this.image_specs_loader.get()
      this.image_preloader.push(one)
      this.image_specs.push(one)

      let already_viewed = this.image_specs.slice(0, this.pointer)
      this.image_preloader.push_array(already_viewed)

      this.preload()
   }

   preload() {
      let max_length = this.max_pointer + this.config.next_images_preload
      if (this.image_specs.length >= max_length) return
      let loaded_image_specs = this.image_specs_loader.get_all()
      this.image_specs.push(...loaded_image_specs)
      this.image_preloader.push_array(loaded_image_specs)
   }

   async next() {
      this.is_nexdt_waiting = true
      let is_next_available = this.pointer < this.image_specs.length - 1
      if (!is_next_available) return
      let image_spec = this.image_specs[this.pointer + 1]
      if (!this.try_set_image(image_spec)) return
      this.is_next_waiting = false
      this.preload()
   }

   async prev() {
      let is_prev_available = this.pointer > 0
      if (!is_prev_available) return
      this.is_prev_waiting = true
      let image_spec = this.image_specs[this.pointer - 1]
      if (!this.try_set_image(image_spec)) return
      this.is_prev_waiting = false
      this.preload()
   }

}

export class ImageLoader {
   constructor({ config, storage, page_analyser }) {
      this.config = config
      this.page_analyser = page_analyser
      this.storage = storage

      this.image_setter = new ImageSetter(this.config, this.page_analyser)
      this.img_url_getter = new RndImgUrl(config, storage)

      this.manager = new ImageLoaderManager(config, this.image_setter, this.img_url_getter)

      this.on = false

      this.next_interval_runner = new IntervalRunner({
         name: 'image_loader_next',
         interval_min: this.config.update_bg_img_time_min,
         callback: () => { this.next() }
      })

      this.onImageSet = null
   }

   async run() {
      if (isNull(this.onImageSet))
         throw new Error('onImageSet is empty, set it manually after creating class instance');
      this.manager.onImageSet = this.onImageSet
      this.on = true
      this.image_setter.run()

      await this.manager.init_awaiter

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
      GM.deleteValue(ILStorageKeys.arr)
      GM.deleteValue(ILStorageKeys.pointer)
      GM.deleteValue(ILStorageKeys.pre_arr)
      this.img_url_getter.onError()
   }

   next() {
      this.manager.next()
   }

   prev() {
      this.manager.prev()
   }

   get_current_image_spec() {
      return this.manager.get_current_image_spec()
   }

   is_on() {
      return this.on
   }

   __clear() {
      GM.deleteValue(ILStorageKeys.arr)
      GM.deleteValue(ILStorageKeys.pre_arr)
      GM.deleteValue(ILStorageKeys.pointer)
      this.img_url_getter.__clear()
   }
}