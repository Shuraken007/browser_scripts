import { delay, isDict, urlToRegex, merge_obj } from "../util/common.js"
import { wait_body_load } from "../util/window.js"
import { CacheUrlLoader } from "../cache_url_loader.js"
import { SyncSession } from "./sync_session.js"
import { ImageLoader } from "./image_loader.js"
import { PageAnalyzer } from '../util/page_analyser.js'
import { GmCache } from "../util/gm_cache.js"
import { UiController } from "./ui_controller.js"
import { is_url_match, AutoApprover } from '../services/oauth_user_approver.js'

class Wallpaper {
   constructor() {
      this.on = false
      this.cache_url_loader = new CacheUrlLoader()
      this.config = null
      this.any_url_matched = false

      this.storage = new GmCache({}, 'wallpaper_cache', 15);
      this.sync_session = new SyncSession(3 * 60, this.storage, G_SYNC_FOLDER, 'wallpapers.json')
      this.ui_controller = null
      this.image_loader = null

      this.init_promise = this.init()
      this.onScrollCall = () => { this.onScroll() }
   }

   async init() {
      let loaded_config = await this.cache_url_loader.load(CONFIG_URL)
      if (loaded_config.wallpapers !== null)
         loaded_config = loaded_config.wallpapers
      this.loaded_config = loaded_config
      await this.storage.get_init_awaiter()
   }

   build_config_by_url() {
      let config = structuredClone(this.loaded_config.common)
      for (let [key, config_by_url] of Object.entries(this.loaded_config)) {
         if (key === 'common')
            continue
         if (!isDict(config_by_url))
            continue;
         let url_regex = urlToRegex(config_by_url.url);
         if (!url_regex.test(window.location.href))
            continue;
         merge_obj(config, config_by_url)
      }

      // by default wallpaper active
      if (!config.hasOwnProperty('is_wallpaper'))
         config.is_wallpaper = true

      return config
   }

   run() {
      if (!this.image_loader.is_on() && this.config.is_wallpaper !== false)
         this.image_loader.run()
      if (this.on)
         return
      this.on = true
      this.sync_session.run()
      this.ui_controller.render()
   }

   stop() {
      if (!this.on)
         return
      this.on = false
      this.sync_session.stop()
      this.image_loader.stop()
   }

   async onLoad() {
      this.config = this.build_config_by_url()

      this.page_analyser = new PageAnalyzer({})
      this.image_loader = new ImageLoader({
         config: this.config,
         onUpdate: (src) => { this.set_image(src) },
         storage: this.storage,
         page_analyser: this.page_analyser,
      })
      this.ui_controller = new UiController(this.page_analyser, this.image_loader)
      let onImageSet = (image_spec) => { this.ui_controller.onImageSet(image_spec) }
      this.image_loader.onImageSet = onImageSet

      this.run()
   }

   onError(err) {
      console.log(err)
      this.image_loader.onError()
      this.cache_url_loader.onError()
   }

   __clear() {
      // this.storage.__clear()
      this.image_loader.__clear()
   }
}

async function main() {
   let creds = JSON.parse(G_CREDS)
   if (is_url_match(creds.client_id)) {
      let auto_approver = new AutoApprover()
      auto_approver.run()
   } else {
      let wallpaper = new Wallpaper();
      await wallpaper.init_promise;
      await wait_body_load(10000);
      wallpaper.onLoad();
   }
}

main()