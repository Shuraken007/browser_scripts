import jQuery from 'jquery';
import './rm_style.css';
import { ScriptRunner, mutation_modes } from "../script_runner.js";
import * as util from '../util.js'
import { CacheUrlLoader } from "../cache_url_loader.js"
import { TgSender } from '../tg_sender.js';

const $ = jQuery.noConflict(true);

const style = {
   padding: 60,
   width_points: [1200],
   font_size: [26],
   text_indent: "22.75px",
   text_align: "left",
   default_width_points: 1200,
   default_font_size: 26,
   bottom: 1000,
   bg_color: [229, 207, 157], // #E5CF9D
   font_color: [38, 36, 37], // #262425
   fixed_bg_images: [
      // "https://w.wallhaven.cc/full/eo/wallhaven-eoljmk.jpg",
      // "https://ranobe.me/images/bg/4.jpg",
      "https://www.royalroad.com/dist/img/new-bg-small.jpg",
      // https://wallhaven.cc/api/v1/search?q=castle&categories=110&purity=110&sorting=toplist&topRange=1y&atleast=1200x500&page=1
      // https://gist.github.com/taiwbi/ddd6cd85028f67d3a1ba6cac82c9c65d
   ]
}

class Util {

   static split_with_delim(str, delim, delim_as) {
      if (!delim_as) {
         delim_as = delim
      }
      let arr = str.split(delim)
      if (arr.length == 1) return arr
      let new_arr = []
      for (let i = 0; i < arr.length; i++) {
         let item = arr[i]
         if (item !== '')
            new_arr.push(item)
         if (i != arr.length - 1)
            new_arr.push(delim_as)
      }
      return new_arr
   }

   // allow to store parent calls in string $(".btn").parent() -> $(".btn:parent()")
   static extended_calls = ["parent"]
   static jq(query) {
      let splited = [query]
      for (const e_call of Util.extended_calls) {
         let new_splited = []
         for (let i = 0; i < splited.length; i++) {
            let arr = Util.split_with_delim(splited[i], `:${e_call}()`, e_call)
            new_splited = new_splited.concat(arr)
         }
         splited = new_splited
      }
      let x = $(splited[0])
      splited.slice(1).forEach(function (q) {
         if (Util.extended_calls.includes(q)) {
            x = x[q]()
         }
      });
      return x
   }

   static detect_inner_container() {
      let x = $('p')
      if (x.length < 1) {
         return null
      }
      return x.eq(Math.ceil(x.length / 2) - 1).parent()
   }

   static col(rgb_arr) {
      let color_val = rgb_arr.join(',')
      if (rgb_arr.length == 4) {
         return `rgba(${color_val})`
      }
      return `rgb(${color_val})`
   }

   static c2hex(c) {
      var hex = c.toString(16);
      return hex.length == 1 ? "0" + hex : hex;
   }

   // static not_visible_colors = ["", "transparent", "rgba(0,0,0,0)"]

   static add_important_style(jq_element, style_element, style_value) {
      let value_str = (`${style_element}: ${style_value} !important;`)
      jq_element.attr('style', function (i, s) {
         if (s && s.includes(`${style_element}:`)) {
            let regexp_str = util.escapeRegexChars(`${style_element}:`) + ".+?(?:;|$)"
            s = s.replace(new RegExp(regexp_str), "")
         }
         return (s || '') + value_str
      });
   }

   static set_color(jq_element, style_color, new_color) {
      let c = new_color;
      let new_color_str;

      if (new_color.length === 4) {
         new_color_str = Util.col(new_color)
         Util.add_important_style(jq_element, style_color, new_color_str)
         // jq_element.css(style_color, new_color_str)
         return
      }
      let color_str = jq_element
         .css(style_color)
         .replace(/\s+/g, '')
         .toLowerCase()
      // if (Util.not_visible_colors.includes(color_str)) return;
      if (color_str.includes("rgb(")) {
         new_color_str = Util.col(new_color)
      } else if (color_str.includes("rgba(")) {
         let t = color_str.match(/([^,]+)\)$/)[1]
         new_color_str = `rgba(${c[0]},${c[1]},${c[2]},${t})`
      } else if (color_str.include("#") && color_str.length <= 6) {
         new_color_str = `#${c2hex(c[0])}${c2hex(c[1])}${c2hex(c[2])}`
      } else if (color_str.include("#") && color_str.length > 6) {
         let t = color_str.match(/(..)$/)[1]
         new_color_str = `#${c2hex(c[0])}${c2hex(c[1])}${c2hex(c[2])}${t}`
      } else {
         return
      }
      Util.add_important_style(jq_element, style_color, new_color_str)
      // jq_element.css(style_color, new_color_str)
   }

   static async load_image(src) {
      const img = new Image();
      img.src = src;
      await img.decode();
      return img;
   }

   static rnd_n_item(arr, n) {
      if (n === 0) return []
      let sel = []
      sel.push(util.rnd_from_arr(arr))
      let selected_idx = [0]
      n -= 1
      while (n > 0 && sel.length <= arr.length) {
         let i = Math.floor(Math.random() * arr.length)
         if (selected_idx.includes(i)) continue
         sel.push(arr[i])
         selected_idx.push(i)
         n -= 1
      }
      return sel
   }

   static w() {
      return document.body.clientWidth
   }
   static h() {
      return window.innerHeight
   }
   static fh() {
      let r = document.body.getBoundingClientRect()
      return document.body.clientHeight + (r.top + window.scrollY)
   }
}

class Reader {
   constructor() {
      this.cache_url_loader = new CacheUrlLoader()
      this.on = true;
      this.bg_time = null; // time when background set

      this.image = null;
      this.is_paralax = false
      this.paralax_k = null;

      this.wallhaven = null
      this.tg_sender = new TgSender()
   }

   async init() {
      this.config = await this.cache_url_loader.load(CONFIG_URL)
      if (this.config.reader_mode !== null)
         this.config = this.config.reader_mode
      this.preLoad()
   }

   async preLoad() {
      // prepare config - convert urls to regular expressions
      if (this.config.config && this.config.config.wallhaven_url)
         this.load_wallhaven_async()
      for (let [k, v] of Object.entries(this.config)) {
         if (k === "config") continue
         v.url = util.urlToRegex(v.url);
      }
   }

   async load_wallhaven_async() {
      this.wallhaven = await this.cache_url_loader.load(this.config.config.wallhaven_url)
   }

   onLoad() {
      window.addEventListener("resize", () => { this.onMutation() });
   }

   async onMutation() {
      for (const [k, v] of Object.entries(this.config)) {
         if (k === "config") continue
         if (!v.url.test(window.location.href)) continue;
         await this.prepareNewPage(v)
      }
   }

   async prepareNewPage(settings) {
      if (settings.remove) {
         settings.remove.forEach(e => { Util.jq(e).remove() });
      }
      if (settings.hide)
         settings.hide.forEach(e => Util.jq(e).hide());
      if (settings.transparent)
         settings.transparent.forEach(e => $(e).css('background-color', "rgba(0,0,0,0)")
         );

      if (settings.is_reader === false)
         return

      let divs = this.get_divs(settings)
      let width, font_size;
      if (divs.length > 0) {
         [width, font_size] = this.get_width_and_font(divs)
         this.align_text_container(divs, width, settings);
         this.add_font(divs, font_size, settings)
         this.add_bottom_space(divs, settings)
         this.add_color(divs, width, settings)
      }

      if (settings.manual)
         settings.manual();

      if (divs.length > 0 && settings.bg_img !== false) {
         await this.add_background(divs, settings)
      }


      if (settings.next)
         this.add_window_scroll_event(settings);
   }

   get_divs(settings) {
      let text_div;
      let divs = []
      if (settings.div_with_content)
         text_div = Util.jq(settings.div_with_content);

      if (!text_div) {
         text_div = Util.detect_inner_container();
      }
      if (!text_div) return divs;
      while (text_div.get(0) !== document.body) {
         divs.push(text_div);
         text_div = text_div.parent()
      }
      return divs;
   }

   get_width_and_font(divs) {
      let max_width = Util.w() * 0.85
      let width_i = -1;
      for (let i = 0; i < style.width_points.length; i++) {
         let width = style.width_points[i];
         if (Util.w() < width) continue;
         width_i = i;
         break
      }
      let width = width_i >= 0
         ? Math.min(style.width_points[width_i], max_width)
         : max_width;
      let font_size = width_i >= 0
         ? style.font_size[width_i]
         : style.default_font_size
      return [width, font_size]
   }

   align_text_container(divs, width, settings) {
      let padding = style.padding
      let is_first = true
      for (let div of divs) {
         if (div.innerWidth() > width && !is_first) continue
         div.css({
            "max-width": `${width}px`,
            "margin": "auto auto",
            "padding-left": `${padding}px`,
            "padding-right": `${padding}px`,
            "border-color": Util.col(style.bg_color),
            "border-width": "0px",
            "border-radius": "30px",
         })
         div.innerWidth(`${width}px`);
         if (is_first) {
            is_first = false
            padding = 0
         }
      }
   }

   add_font(divs, font_size, settings) {
      let first_div = divs[0];
      let style_opts = {
         "font-size": font_size + 'px',
         "text-indent": style.text_indent,
         "text-align": style.text_align,
         "text-size-adjust": "100%",
         "word-break": "break-word",
         "line-height": "41.6px",
         "user-select": "auto",

      }
      let tags = ["strong", "p", "h1", "h2", "h3", "h4", "h5", "h6"];
      for (let tag of tags) {
         first_div.children(tag).addClass('rm_font');
         // first_div.children(tag).css(style_opts);
      }
      for (let i = 6; i > 0; i--) {
         first_div.children("h" + i).css("font-size", font_size + 7 - i + 'px')
      }

      // first_div.children("strong").css("font-size", `${font_size + 6}px`)
      // first_div.children("p").css("font-size", `${font_size}px`)
      // first_div.children("h1").css("font-size", `${font_size + 6}px`)
      // first_div.children("h2").css("font-size", `${font_size + 5}px`)
      // first_div.children("h3").css("font-size", `${font_size + 4}px`)
      // first_div.children("h4").css("font-size", `${font_size + 3}px`)
      // first_div.children("h5").css("font-size", `${font_size + 2}px`)
      // first_div.children("h6").css("font-size", `${font_size + 1}px`)
   }

   add_bottom_space(divs, settings) {
      if ($('body').css('padding-bottom') !== `${style.bottom}px`) {
         $('body').css('height', `auto`)
         $('body').css('padding-bottom', `${style.bottom}px`)
      }
      if ($('body').css('padding-bottom') === `${style.bottom}px`) {
         return
      }
      divs[divs.length - 1].css('padding-bottom', `${style.bottom}px`)
   }

   add_color(divs, width, settings) {
      let first_div = divs[0]
      let rest_divs = divs.slice(1).reverse()

      let bg_color = Util.col(style.bg_color)
      // $("meta[name='theme-color']").attr('content', bg_color);
      first_div.css("background-color", bg_color)
      first_div.css("color", Util.col(style.font_color))
      first_div.siblings("div").each(function () {
         Util.set_color($(this), "background-color", style.bg_color)
      });

      let color = style.bg_color
      if (settings.bg_img !== false) {
         color = [...color, 0]
      }
      for (let div of rest_divs) {
         Util.set_color(div, "background-color", color)
         div.siblings("div").each(function () {
            Util.set_color($(this), "background-color", style.bg_color)
         });
         Util.set_color(div, "border-color", style.bg_color)
         div.css("color", Util.col(style.font_color))
      }
      for (let i = 1; i <= 7; i++) {
         $(`h${i}`).css("color", Util.col(style.font_color))
      }
      $(`strong`).css("color", Util.col(style.font_color))

   }

   get_pepebigotes_vercel_img() {
      return "https://random-image-pepebigotes.vercel.app/api/random-image"
   }

   get_fixed_bg_img() {
      return util.rnd_from_arr(style.fixed_bg_images)
   }

   get_cdn_image() {
      return `https://random.imagecdn.app/${Util.w()}/${Util.h() * 2}#${Math.floor(Math.random() * 10000)}`
   }

   async get_neko_img() {
      let exclude_tags = ['dick'].join(',')
      let rating = [].join(',')
      let tags = [].join(',')
      // let exclude_tags = ['dick', 'exposed_anus', 'exposed_girl_breasts', 'pussy'].join(',')
      // let rating = ['safe', 'safe', 'suggestive', 'borderline'].join(',')
      // let tags = ['flowers', 'night', 'rain', 'reading', 'sunny', 'sword', 'tree', 'weapon']
      let selected_tags = null
      if (Math.random() >= 0.5)
         selected_tags = Util.rnd_n_item(tags, 2).join(',')

      let param_query = ''
      let is_first = true
      for (let [k, v] of Object.entries({ exclude_tags: exclude_tags, rating: rating, tags: selected_tags })) {
         if (!v) continue
         let param = `${k}=${v}`
         if (!is_first)
            param = '&' + param
         param_query += param
         if (is_first)
            is_first = false
      }

      let url = "https://api.nekosapi.com/v4/images/random/file"
      if (param_query)
         url += '?' + param_query
      return url
   }

   get_wallhaven_img() {
      let keys = Object.keys(this.wallhaven);
      let rnd_key = util.rnd_from_arr(keys)
      let rnd_url_arr = this.wallhaven[rnd_key]
      let rnd_url = util.rnd_from_arr(rnd_url_arr)

      let full_url = "https://w.wallhaven.cc/full/" + rnd_url
      return full_url
   }

   async get_rnd_img_getter(settings) {
      if (settings.bg_img) return bg_img

      // if (!this.wallhaven)
      //    await Util.delay(1000)
      if (this.wallhaven && Math.random() < 0.96)
         return "get_wallhaven_img"

      let ways = [
         // "get_pepebigotes_vercel_img",
         "get_fixed_bg_img",
         // "get_cdn_image",
         // "get_neko_img",
      ]
      let way = util.rnd_from_arr(ways)
      return way
   }

   update_paralax_k() {
      if (!this.image) return
      let div = $('#bg_image')
      if (!div) return
      this.paralax_k = this.get_paralax_k()
   }

   async update_bg_image(width, settings) {
      let div = $('#bg_image')
      if (!div) return
      if (div.width() === Util.w() && div.height() === Util.h()) return;

      div.css('width', Util.w() + "px")
      div.css('height', Util.h() + "px")
      let img_height = "auto"
      let img_width = "auto"
      if (Math.abs(this.get_image_height() - Util.h()) < 5) {
         img_height = Util.h() + "px"
      } else {
         img_width = Util.w() + "px"
      }
      $('#bg_image img').css({
         width: img_width,
         height: img_height,
      })
      // $('#bg_image img').animate({
      //    width: img_width,
      //    height: img_height,
      // })
      let size_diff = this.image.clientWidth - Util.w()
      if (size_diff > 0 || this.image.style.left != 0) {
         this.image.style.left = Math.ceil(-size_diff / 2) + "px"
      }

      // $('#bg_image img').css('width', img_width)
      // $('#bg_image img').css('height', img_height)
      if (!this.is_paralax) return
      let was_paralax = this.paralax_k
      this.update_paralax_k()
      // if (Math.abs(was_paralax - this.paralax_k) > 0.0001) {
      //    this.paralax_on_scroll(this)
      // }
   }

   async load_rnd_img_till_ok(settings) {
      let i = 0, j = 0
      let getter_as_str = await this.get_rnd_img_getter(settings)
      let rnd_url
      while (i < 50) {
         try {
            rnd_url = await this[getter_as_str]()
            let start_load = Date.now()
            let image = await Util.load_image(rnd_url)
            // console.log(`got ${image.naturalWidth}x${image.naturalHeight}`)
            if (image && image.naturalWidth) {
               // && image.naturalWidth > window.innerWidth / 2) {
               // console.log(`passed ${image.naturalWidth}x${image.naturalHeight}`)
               return image
            }
         } catch (err) { console.log(`on img ${rnd_url}; err:`); console.log(err); }
         if (j > 5 - 1) {
            // change img url if 5 attempts wrong
            getter_as_str = await this.get_rnd_img_getter(settings)
            j = 0
         }
         i++; j++;
      }
   }

   async add_background(divs, settings) {
      let delta = Date.now() - (this.bg_time || 0)
      if (this.image && delta > 1000 * 60 * 5) {
         // time to change img
         this.image.parentNode.removeChild(this.image);
         this.image = null
      } else if (this.image) {
         // just update div / img scroll
         this.update_bg_image()
         return
      }

      let image = await this.load_rnd_img_till_ok(settings);
      if (!image) {
         console.log('img not founded')
         return
      }

      this.set_bg_image(image, divs, settings)
   }

   configure_bg_div(div, image, settings) {
      div.appendChild(image)

      let style_opts = {
         backgroundColor: "rgb(0,0,0,0)",
         position: "fixed",
         left: "50%",
         transform: "translate(-50%, 0)",
         top: 0,
         width: `${Util.w()}px`,
         height: `${Util.h()}px`,
         "z-index": -10,
      }
      for (let [k, v] of Object.entries(style_opts)) {
         div.style[k.toString()] = v;
      }

      let height = "auto"
      let width = "auto"
      if (Math.abs(this.get_image_height() - Util.h()) < 5) {
         height = Util.h() + "px"
      } else {
         width = Util.w() + "px"
      }

      style_opts = {
         position: "relative",
         width: width,
         height: height,
         // margin: "center",
         // "-webkit-transform": "scale(0.6)", /*Webkit: Scale down image to 0.6x original size*/
         // "-moz-transform": "scale(0.6)", /*Mozilla scale version*/
         // "-o-transform": "scale(0.6)", /*Opera scale version*/
         // "-webkit-transition-duration": "0.5s", /*Webkit: Animation duration*/
         // "-moz-transition-duration": "0.5s", /*Mozilla duration version*/
         // "-o-transition-duration": "0.5s", /*Opera duration version*/
      }
      for (let [k, v] of Object.entries(style_opts)) {
         image.style[k.toString()] = v;
      }

      let size_diff = image.clientWidth - Util.w()
      if (size_diff > 0) {
         image.style.left = Math.ceil(-size_diff / 2) + "px"
      }

   }

   run_opacity_animation(div, final_opacity, frames_n, time) {
      let opacity = Number(div.css('opacity'))
      let diff = final_opacity - opacity;
      for (let i = 1; i <= frames_n; i++) {
         setTimeout(() => {
            div.css('opacity', opacity + i * diff / frames_n)
         }, i * time / frames_n);
      }
   }

   async set_bg_image(image, divs, settings) {
      if (this.image) return
      this.image = image

      let x = document.getElementById('bg_image')
      if (!x) {
         x = document.createElement("div");
         x.setAttribute("id", "bg_image");
         document.body.prepend(x);
      }
      this.configure_bg_div(x, image, settings)
      //    `position: fixed; top: 0; width: ${Util.w()}px; height: ${Util.h()}px; z-index: -10; background: url("${image.src}") fixed no-repeat top; background-size:cover; background-attachment: scroll;`
      // x.style.backgroundPosition = "top center";
      document.body.style.backgroundImage = 'none'
      if (settings.bg_img_div) {
         $(settings.bg_img_div).remove()
      }


      if (divs.length > 0) {
         divs[divs.length - 1].css('opacity', 0.7)
         this.run_opacity_animation(divs[divs.length - 1], 1.0, 1000, 10000)
         // divs[divs.length - 1].animate({ 'opacity': 1, "animation-direction": "reverse" }, 10000)
      }

      this.bg_time = Date.now()
      // console.log(`blocked ${image.naturalWidth}x${image.naturalHeight}`)

      this.is_paralax = false
      let real_img_height = this.get_image_height()
      if (real_img_height > Util.h()) {
         this.paralax_k = this.get_paralax_k()
         this.is_paralax = true
         // update cause usually document height would increase 
         setTimeout(() => {
            this.update_paralax_k()
         }, 1000)
      }
   }

   get_image_scale(ww = $('#bg_image').width()) {
      let wh = Util.h()
      // let ww = Util.w()
      let iw = this.image.naturalWidth
      let ih = this.image.naturalHeight

      let scale;
      if (ww / wh > iw / ih) {
         scale = ww / iw
      } else {
         scale = wh / ih
      }
      return scale
   }

   get_image_height(ww = $('#bg_image').width()) {
      return Math.ceil(this.image.naturalHeight * this.get_image_scale(ww))
   }

   get_image_width(ww = $('#bg_image').width()) {
      return Math.ceil(this.image.naturalWidth * this.get_image_scale(ww))
   }

   get_paralax_k(ww = $('#bg_image').width()) {
      let page_height = Util.fh()
      let height_add = window.innerHeight
      let real_img_height = this.get_image_height(ww)
      // console.log(`rih: ${real_img_height}`)
      // console.log({
      //    img_width: this.image.naturalWidth,
      //    img_height: this.image.naturalHeight,
      //    real_img_height: this.get_image_height(ww),
      //    height_add: height_add,
      //    page_height: page_height,
      //    result: real_img_height / (page_height - height_add)
      // })

      return (real_img_height - height_add) / (page_height - height_add)
   }

   paralax_on_scroll(cls) {
      if (!this.is_paralax) return
      if (!this.image) return
      let div = $('#bg_image')
      if (!div) return
      let offset = div.offset().top
      let posY = Math.ceil(-1 * offset * cls.paralax_k)
      let img_diff = posY - this.image.offsetTop
      let max_diff = (25 / 1200) * Util.h()
      if (Math.abs(img_diff) > max_diff) {
         // prevent img jump, as example - on block with commants loaded / expanded
         posY = Math.ceil(this.image.offsetTop + Math.sign(img_diff) * max_diff)
      }
      this.image.style.top = `${posY}px`;
   }

   next_chapter_on_scroll(settings) {
      if ($(window).scrollTop() + 2 > $(document).height() - $(window).height()) {
         let x = Util.jq(settings.next).get(0)
         if (x) x.click();
      }
   }

   add_window_scroll_event(settings) {
      if (window.already_scroll_subscribed) return;
      window.already_scroll_subscribed = true
      let cls = this
      $(window).on('scroll', function () {
         script_runner.ob_disconnect()
         cls.next_chapter_on_scroll(settings)
         cls.paralax_on_scroll(cls)
         script_runner.ob_connect()
      }).scroll();
   }
}

let reader = new Reader();
await reader.init();

let script_runner = new ScriptRunner(
   {
      name: "reader_mode",
      onLoad: () => { reader.onLoad() },
      onMutation: async () => { await reader.onMutation() },
      mutation_mode: mutation_modes.once_per_bunch,
   });
script_runner.run()