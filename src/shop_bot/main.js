import { CacheUrlLoader } from "../cache_url_loader.js"

class Bot {
   constructor() {
      this.init_promise = this.init()
      this.cache_url_loader = new CacheUrlLoader()
   }

   async init() {
      this.config = await this.cache_url_loader.load(CONFIG_URL)
   }

   print() {
      console.log(this.config)
      console.log('smth gone wrong')
   }
}

let bot = new Bot();
await bot.init_promise;


Object.assign(
   unsafeWindow,
   {
      bot: bot,
   }
)