async function delay(ms) {
   return new Promise(resolve => setTimeout(resolve, ms))
}

async function xml_request(url) {
   return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
         method: 'GET',
         url: url,
         responseType: 'text',
         headers: {
            'Content-Type': 'text/css'
         },
         onload: response => {
            return resolve(response)
         },
         onabort() {
            reject(new DOMException("Aborted", "AbortError"));
         },
         ontimeout() {
            reject(new TypeError("Network request failed, timeout"));
         },
         onerror(err) {
            reject(new TypeError("Failed to fetch: " + err.finalUrl));
         },
      });
   })
}

async function xml_load(url) {
   let response;
   try {
      response = await xml_request(url);
   } catch (err) {
      throw Error(
         `loading: ${url}f
          err: ${err}`);
   }
   if (response.status == 200) {
      return response.responseText;
   } else {
      throw Error(
         `loading: ${url}
            status: ${response.status}
            response: ${response.response}
            `);
   }
}

const api_url = "https://wallhaven.cc/api/v1/search";
let url_params = {
   apikey: "6Vtfzpdd27pwfVKC79xoRRJHrxSChwUL",
   categories: "111", // General, Anime, People 
   purity: "110", // SFW, Sketchy, NSFW 
   sorting: "random", // date_added relevance random views favorites toplist automaticlly  
   topRange: "1y", // 1d 3d 1w 1M 3M 6M 1y 
   // order: "desc",
   ratios: "", // landscape portrait 16x9 16x10 21x9 32x9 ... 
   atleast: "800x500", // 
}

class RndWallpaper {
   constructor() {
      this.fix_url = this.build_url_fix_part();
      this.cache = {}
      this.alpha_digit_str = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
   }

   build_url_fix_part() {
      let query_params = Object.entries(url_params).map(([k, v]) => `${k}=${v}`);
      return `${api_url}?${query_params.join("&")}`
   }

   get_rnd_seed() {
      let seed = ""
      let len = this.alpha_digit_str.length
      for (let i = 0; i < 6; i++) {
         seed += this.alpha_digit_str[Math.floor(Math.random() * len)]
      }
      return seed;
   }

   async get_url() {
      let seed = this.get_rnd_seed();
      let url = `${this.fix_url}&seed=${seed}`;
      let data = await xml_load(url);
      let res = JSON.parse(data)
      return res.data[0].url
   }
}

const tags = ['grass', 'castle', 'river', 'mountain', 'forest', 'sea', 'beach', 'night', 'sky', 'art', 'landscape', 'fantasy', ''];

async function main() {
   await delay(1000);
   let rnd_wallpaper = new RndWallpaper();
   let res = await rnd_wallpaper.get_url();
   console.log(res);
}

main()