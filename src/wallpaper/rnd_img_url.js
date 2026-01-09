import { rnd_from_arr, rnd_obj_by_amount } from "../util/common.js";
import { WallHavenLoader } from "./loaders/wallhaven_loader.js";
import { ManualLoader } from "./loaders/manual_loader.js";

export class RndImgUrl {
   constructor(config, storage) {
      this.config = config
      this.storage = storage

      this.loaders = {
         manual: new ManualLoader(this.config.manual_likes, 'manual'),
         wallhaven: new WallHavenLoader(storage, 'wallhaven'),
      }
   }

   async onReload(likes_pct) {
      this.likes_pct = likes_pct
   }

   onError() {
   }

   try_get_likes_loader() {
      let rnd_loader = rnd_obj_by_amount(
         Object.values(this.loaders),
         (loader) => loader.get_likes_length()
      )
      let likes_length = rnd_loader.get_likes_length()
      if (likes_length === 0) {
         return null
      }
      return rnd_loader
   }

   async get_image_spec() {
      let rnd = Math.random()
      // first attempt to return smth from likes
      if (rnd < this.config.likes_pct / 100) {
         let loader = this.try_get_likes_loader()
         if (loader) {
            return loader.get_random_like()
         }
      }

      // second attempt - return from loaded wallpapers
      let rnd_loader = this.loaders.wallhaven
      return rnd_loader.get_image_spec()
   }

   __clear() {
      Object.values(this.loaders).forEach(l => l.__clear())
   }
}