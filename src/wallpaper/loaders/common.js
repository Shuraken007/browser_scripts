export function get_loader_storage(common_storage, alias) {
   if (!(alias in common_storage)) {
      common_storage[alias] = {
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
      };
   }
   return common_storage[alias];
}

export class ImageSpec {
   constructor(url, id, loader) {
      this.url = url;
      this.id = id;
      this.loader = loader
   }

   toJSON() {
      return JSON.stringify({ url: this.url, id: this.id, loader: this.loader.name })
   }

   static fromJSON(str, map_loader_name_to_loader) {
      let json = JSON.parse(str)
      return new ImageSpec(json.url, json.id, map_loader_name_to_loader[json.loader])
   }
}