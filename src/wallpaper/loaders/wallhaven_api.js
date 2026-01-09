export class WallHavenApi {
   build_search_url() {
      let url_params = {
         apikey: W_TOKEN,
         categories: "110", // General, Anime, People 
         purity: "100", // SFW, Sketchy, NSFW
         sorting: "random", // date_added relevance random views favorites toplist automaticlly  
         topRange: "1y", // 1d 3d 1w 1M 3M 6M 1y 
         // order: "desc",
         ratios: "", // landscape portrait 16x9 16x10 21x9 32x9 ... 
         atleast: "800x500", // 
      }
      let query_params = Object.entries(url_params).map(([k, v]) => `${k}=${v}`);
      let search_url = "https://wallhaven.cc/api/v1/search";
      return `${search_url}?${query_params.join("&")}`
   }

   constructor() {
      this.search_url = this.build_search_url();
      this.info_url = "https://wallhaven.cc/api/v1/w/";

      this.alpha_digit_str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
   }

   get_rnd_seed() {
      let seed = ""
      let len = this.alpha_digit_str.length
      for (let i = 0; i < 6; i++) {
         seed += this.alpha_digit_str[Math.floor(Math.random() * len)]
      }
      return seed;
   }

   get_search_url(tags = [], with_seed = true, page = 1) {
      let url = this.search_url;
      if (with_seed) {
         let seed = this.get_rnd_seed();
         url += `&seed=${seed}`;
      }
      if (page > 1) {
         url += `&page=${page}`;
      }
      if (tags.length > 0) {
         url += `&q=${tags.join("+")}`
      }
      return url
   }

   get_info_url(id) {
      return `${this.info_url}${id}`;
   }
}