import { urlToRegex, merge_obj, delay } from '../util/common.js'
import { jq } from '../util/jq.js'
import { ScriptRunner, mutation_modes } from "../script_runner.js";
import { CacheUrlLoader } from "../cache_url_loader.js"

let script_runner;

class Cleaner {
   constructor() {
      this.on = false
      this.cache_url_loader = new CacheUrlLoader()
      this.config = null
      this.any_url_matched = false
      this.init_promise = this.init()
   }

   async init() {
      let loaded_config = await this.cache_url_loader.load(CONFIG_URL)
      if (loaded_config.cleaner_mode !== null)
         loaded_config = loaded_config.cleaner_mode
      this.loaded_config = loaded_config
   }

   build_config_by_url() {
      let config = {}
      for (let config_by_url of Object.values(this.loaded_config)) {
         let url_regex = urlToRegex(config_by_url.url);
         if (!url_regex.test(window.location.href))
            continue;
         this.any_url_matched = true
         merge_obj(config, config_by_url)
      }
      return config
   }

   run() {
      this.on = true
   }

   stop() {
      this.on = false
   }

   async onLoad() {
      this.config = this.build_config_by_url()

      if (!this.any_url_matched)
         return this.stop()

      this.run()
      await this.onMutation()
      await delay(200)
      await this.onMutation()
   }

   async onReload() {
      // await this.init()
      // await this.onLoad()
   }

   async onUrlUpdate() {
      this.config_by_url = this.build_config_by_url()
      if (this.any_url_matched) {
         this.run()
      } else {
         this.stop()
      }
   }

   onError(err) {
      console.log(err)
      this.cache_url_loader.onError()
   }

   async onMutation() {
      if (!this.any_url_matched) return
      this.prepareNewPage()
   }

   prepareNewPage() {
      let conf = this.config
      if (conf.remove)
         conf.remove.forEach(e => jq(e).forEach(node => node.remove()));
      if (conf.hide)
         conf.hide.forEach(e => jq(e).forEach(node => node.style.display = 'none'));
   }
}

let cleaner = new Cleaner();
await cleaner.init_promise;
script_runner = new ScriptRunner(
   {
      name: "cleaner",
      script: cleaner,
      mutation_mode: mutation_modes.once_per_bunch,
   });
script_runner.run()