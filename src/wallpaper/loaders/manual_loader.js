import { ImageSpec } from './common.js';
import { Likes } from "./likes.js";

export class ManualLoader {
   constructor(manual_likes, name) {
      this.name = name
      this.likes = new Likes(manual_likes);
   }

   async get_image_spec_by_id(id) {
      return new ImageSpec(id, id, this);
   }

   get_likes_length() {
      return this.likes.length();
   }

   get_random_like() {
      let id = this.likes.get_random();
      return this.get_image_spec_by_id(id);
   }

   is_liked(image_spec) {
      return true
   }

   is_disliked(image_spec) {
      return false
   }

   like(image_spec, is_other_state) {
      return false
   }

   dislike(image_spec, is_other_state) {
      return false
   }

   __clear() {
   }
}