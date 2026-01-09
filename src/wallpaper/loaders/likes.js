import { rnd_idx_from_arr } from "../../util/common.js";

export class Likes {
   constructor(likes) {
      this.likes = likes
      this.not_viewed_likes = structuredClone(this.likes)
   }

   length() {
      return Object.keys(this.likes).length
   }

   get_random() {
      if (this.not_viewed_likes.length === 0)
         this.not_viewed_likes = structuredClone(this.likes)
      let rnd_idx = rnd_idx_from_arr(this.not_viewed_likes)
      let rnd_like = this.not_viewed_likes[rnd_idx]
      this.not_viewed_likes.splice(rnd_idx, 1)
      return rnd_like
   }
}
