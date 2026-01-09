import { rnd_idx_from_arr } from "../../util/common.js";

const default_storage = {
   likes: [],
   like_details: {
      tags: {},
      categories: {},
      colors: {},
      authors: {},
   },
   dislikes: [],
   dislike_details: {
      tags: {},
      categories: {},
      colors: {},
      authors: {},
   },
}

export class WallHavenStorage {
   constructor(common_storage, alias) {
      this.name = alias
      this.common_storage = common_storage
      this.storage = this.init_storage(common_storage, alias)
      this.not_viewed_likes = structuredClone(this.storage.likes)
   }

   init_storage(common_storage, alias) {
      if (!common_storage[alias]) {
         common_storage[alias] = default_storage
      }
      return common_storage[alias]
   }

   get_likes_length() {
      return this.storage.likes.length;
   }

   get_random_like() {
      if (this.not_viewed_likes.length === 0)
         this.not_viewed_likes = structuredClone(this.storage.likes)
      let rnd_idx = rnd_idx_from_arr(this.not_viewed_likes)
      let rnd_like = this.not_viewed_likes[rnd_idx]
      this.not_viewed_likes.splice(rnd_idx, 1)
      return rnd_like
   }

   is_liked(id) {
      return this.storage.likes.includes(id)
   }

   is_disliked(id) {
      return this.storage.dislikes.includes(id)
   }

   add(is_like, image_spec, details) {
      let arr = is_like ? this.storage.likes : this.storage.dislikes

      if (arr.includes(image_spec.id))
         return

      arr.push(image_spec.id)

      let obj = is_like ? this.storage.like_details : this.storage.dislike_details

      details.tags.forEach(x => obj.tags[x] = (obj.tags[x] || 0) + 1)
      details.categories.forEach(x => obj.categories[x] = (obj.categories[x] || 0) + 1)
      details.colors.forEach(x => obj.colors[x] = (obj.colors[x] || 0) + 1)
      if (details.author !== 'deleted')
         obj.authors[details.author] = (obj.authors[details.author] || 0) + 1

      this.common_storage.save()
   }

   async remove(is_like, image_spec, details) {
      let arr = is_like ? this.storage.likes : this.storage.dislikes

      if (!arr.includes(image_spec.id))
         return

      let i = arr.indexOf(image_spec.id)
      arr.splice(i, 1)

      let obj = is_like ? this.storage.like_details : this.storage.dislike_details

      details.tags.forEach(x => obj.tags[x] = Math.max((obj.tags[x] || 0) - 1), 0)
      details.categories.forEach(x => obj.categories[x] = Math.max((obj.categories[x] || 0) - 1), 0)
      details.colors.forEach(x => obj.colors[x] = Math.max((obj.colors[x] || 0) - 1), 0)
      if (obj.authors[details.author])
         obj.authors[details.author] = Math.max((obj.authors[details.author] || 0) - 1, 0)

      this.common_storage.save()
   }

   get_k_by_arr(arr, map) {
      let total = Object.values(map).reduce((a, b) => a + b, 0)
      let val = arr.reduce((sum, x) => sum + (map[x] || 0) / total, 0)
      return val * 100
   }

   get_metric(details) {
      let tags_metric =
         this.get_k_by_arr(details.tags, this.storage.like_details.tags)
         -
         this.get_k_by_arr(details.tags, this.storage.dislike_details.tags)
      let categories_metric =
         this.get_k_by_arr(details.categories, this.storage.like_details.categories)
         -
         this.get_k_by_arr(details.categories, this.storage.dislike_details.categories)

      let total_metric = (tags_metric + categories_metric) / 2

      return total_metric
   }

   __clear() {
      this.cache.__clear()
   }
}