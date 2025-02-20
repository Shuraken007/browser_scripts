// ==UserScript==
// @name         Infinite Scroll
// @namespace    http://tampermonkey.net/
// @version      0.1
// @license MIT
// @description  infinite scroll for reading books
// @run-at        document-start
// @require     http://ajax.googleapis.com/ajax/libs/jquery/1.9.1/jquery.min.js
// @author       Shuraken007
// @include https://*/*
// @include http://*/*
// ==/UserScript==

/* jshint esversion: 9 */
'use strict';

this.$ = this.jQuery = jQuery.noConflict(true);
{
   const style = {
      padding: 60,
      width_points: [1200],
      font_size: [26],
      default_width_points: 1200,
      default_font_size: 26,
      bottom: 1000,
      bg_color: [229, 207, 157], //E5CF9D
   }

   let config = {
      "royalroad": {
         "url": "https://www.royalroad.com/fiction/*/*/chapter/*/*",
         "next": '.btn:contains("Next")',
         "remove": [
            '.author-note-portlet', '.portlet-footer', '.portlet.light:contains("About the author")',
            'h5:contains("Support")', '#donate', '#Chapter_Bottom_Mobile:parent():parent()',
            '.btn:contains("Pay"):parent():parent()',
            'div:contains("Advertisement"):not(:has(*)):parent()',
         ],
         "hide": ['.fic-header', '.page-header', '.page-prefooter',],
         "manual": function () {
            Util.set_color($('.background-overlay'), 'background-color', [0, 0, 0, 0])
            Util.set_color($('.page-container'), 'background-color', [0, 0, 0, 0])
            Util.set_color($('.page-content-wrapper'), 'background-color', [0, 0, 0, 0])
            Util.set_color($('.page-content'), 'background-color', [0, 0, 0, 0])
            // $('body').css('background-image', 'url("https://wallpapers.com/images/hd/epic-scenery-with-lava-akxg1bi24b0hlxcp.webp")')
            // rgba(229, 207, 157, 0) url("https://ranobe.me/images/bg/4.jpg") repeat scroll 50 % 0px / auto padding - box border - box
            // 'rgba(0, 0, 0, 0) url("https://www.royalroad.com/dist/img/new-bg-small.jpg") no-repeat fixed 50% 50% / cover padding-box border-box'
            $('body').css("background", 'rgba(0, 0, 0, 0) url("https://www.royalroad.com/dist/img/new-bg-small.jpg") repeat scroll 50 % 0px / auto padding - box border - box')
         }
      },
      "ranobe.me": {
         "url": "https://ranobe.me/ranobe*/*",
         "next": '.read_nav_button.read_nav_button_bottom:contains("Следующая")',
         "font": "#fontSize",
         "remove": [".footer", "#header", ".MessageAloneHead", ".leftbar-wrap", "#site-content-left", "#site-content-right"],
         // "hide": [".footer", "#header", ".MessageAloneHead", ".leftbar-wrap", "#site-content-left", "#site-content-right"],
         "manual": function () {
            $('.darklight').removeClass('darklight');
            // if ($('#darklight').html() === '1') {
            //    $('.edit-darklight').click()
            // }
            $('#site-content').css('background-color', "rgba(0,0,0,0)")
            // document.body.style.fontFamily = "Georgia"
         }
      },
      "ranobelib": {
         "url": "https://ranobelib.me/ru/*/read/v*/*",
         "next": '.btn:contains("Вперёд")',
      },
   };

   class Util {

      static prepareRegex(string, is_star_special = false) {
         // escape: []^&$.()?/\+{}|
         string = string.replace(/([\[\]\^\&\$\.\(\)\?\/\\\+\{\}\|])/g, '\\$1');
         if (!is_star_special) {
            string = string.replaceAll('*', '\\*')
         } else {
            // '*' -> '[^ ]*', but '\*' -> '*'
            string = string.replace(/\\?\*/g, function (fullMatch) {
               return fullMatch === '\\*' ? '*' : '[^ ]*';
            });
         }
         return string;
      }

      static getRegFromString(string, is_global_required) {
         var a = string.split("/");
         let modifiers = a.pop();
         a.shift();
         let pattern = a.join("/");
         if (is_global_required && !modifiers.includes('g')) {
            modifiers += 'g';
         }
         return new RegExp(pattern, modifiers);
      }

      static rIsRegexp = /^\/(.+)\/(\w+)?$/;

      static tokenToRegex(string, is_prepared = false) {
         if (string.match(Util.rIsRegexp)) {
            return Util.getRegFromString(string, true);
         }

         if (is_prepared) {
            string = Util.prepareRegex(string, true);
            return new RegExp(string);
         }
         return string;
      }

      static async delay(ms) {
         return new Promise(resolve => setTimeout(resolve, ms))
      }

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

      // static async repeat_till_n_success(call, desired_n = 1, delta = 100, cur_n = 0, total_n = 0) {
      //    total_n += 1;
      //    let amount = call();
      //    cur_n += amount;
      //    if (cur_n >= desired_n) { return }
      //    if (total_n >= 100) { return }
      //    await Util.delay(delta);
      //    Util.repeat_till_n_success(call, desired_n, delta, cur_n, total_n);
      // }

      // static async remove_jquery_till_success(query, n = 1) {
      //    await Util.repeat_till_n_success(() => {
      //       let x = Util.jq(query)
      //       x.remove()
      //       return x.length
      //    }, n);
      // }

      static detect_inner_container() {
         let x = $('p')
         if (x.length < 1) {
            return null
         }
         return x.eq(Math.ceil(x.length / 2) - 1).parent()
      }

      static c2hex(c) {
         var hex = c.toString(16);
         return hex.length == 1 ? "0" + hex : hex;
      }

      // static not_visible_colors = ["", "transparent", "rgba(0,0,0,0)"]

      static set_color(jq_element, style_color, new_color) {
         let c = new_color;
         if (new_color.length === 4) {
            jq_element.css(style_color, `rgba(${c[0]},${c[1]},${c[2]},${c[3]})`)
            return
         }
         let color_str = jq_element
            .css(style_color)
            .replace(/\s+/g, '')
            .toLowerCase()
         // if (Util.not_visible_colors.includes(color_str)) return;
         let new_color_str;
         if (color_str.includes("rgb(")) {
            new_color_str = `rgb(${c[0]},${c[1]},${c[2]})`
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
         jq_element.css(style_color, new_color_str)
      }

   }
   // prepareRegex by JoeSimmons
   // used to take a string and ready it for use in new RegExp()

   class ScriptRunner {
      constructor() {
         this.on = true;
         this.cur_url = window.location.href;
         this.observer = null
         this.is_run_blocked = false;
      }

      ob_disconnect() {
         this.observer.disconnect()
      }

      ob_connect() {
         this.observer.observe(document.body, { childList: true, subtree: true });
      }

      preLoad() {
         // prepare config - convert urls to regular expressions
         for (let [_, v] of Object.entries(config)) {
            v.url = Util.tokenToRegex(v.url, true);
         }

         this.observer = new MutationObserver(
            mutations => this.run_mutations()
         );
         this.ob_connect();
      }

      run_mutations() {
         if (!this.on) return;
         if (this.is_run_blocked) return;
         this.is_run_blocked = true
         let cls = this
         setTimeout(() => cls.run(), 10);
      }

      run() {
         this.ob_disconnect()
         for (const [_, v] of Object.entries(config)) {
            if (!v.url.test(window.location.href)) continue;
            this.prepareNewPage(v)
         }
         this.ob_connect()

         this.is_run_blocked = false
      }

      async prepareNewPage(settings) {
         if (settings.remove)
            settings.remove.forEach(e => Util.jq(e).remove());
         if (settings.hide)
            settings.hide.forEach(e => Util.jq(e).hide());

         let divs = this.get_divs(settings)
         if (divs.length > 0) {
            let { width, font_size } = this.get_width_and_font(divs)
            this.align_text_container(divs, width, settings);
            this.add_font(divs, font_size, settings)
            this.add_bottom_space(divs, settings)
            this.add_color(divs, settings)
         }

         if (settings.manual)
            settings.manual();

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

         let width_i = -1;
         for (let i = 0; i < style.width_points.length; i++) {
            let width = style.width_points[i];
            if (window.innerWidth < width) continue;
            width_i = i;
            break
         }
         let width = width_i >= 0 ? style.width_points[width_i] : window.innerWidth;
         let font_size = width_i >= 0 ? style.font_size[width_i] : style.default_font_size

         return { width, font_size }
      }

      align_text_container(divs, width, settings) {
         let padding = style.padding
         let is_first = true
         for (let div of divs) {
            if (div.innerWidth() > width) continue
            div.css("max-width", `${width}px`);
            div.css("margin", "auto auto");
            div.css("border-width", "0px");
            div.css("padding-left", `${padding}px`);
            div.css("padding-right", `${padding}px`);
            div.innerWidth(`${width}px`);
            if (is_first) {
               is_first = false
               padding = 0
            }
         }

         // console.log($('.site-content').get(0).style)
      }

      add_font(divs, font_size, settings) {
         let first_div = divs[0];
         first_div.add("strong").css("font-size", `${font_size + 6}px`)
         first_div.add("p").css("font-size", `${font_size}px`)
         first_div.add("h1").css("font-size", `${font_size + 6}px`)
         first_div.add("h2").css("font-size", `${font_size + 5}px`)
         first_div.add("h3").css("font-size", `${font_size + 4}px`)
         first_div.add("h4").css("font-size", `${font_size + 3}px`)
         first_div.add("h5").css("font-size", `${font_size + 2}px`)
         first_div.add("h6").css("font-size", `${font_size + 1}px`)
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

      add_color(divs, settings) {
         let first_div = divs[0]
         let rest_divs = divs.slice(1).reverse()

         let c = style.bg_color
         let bg_color = `rgb(${c[0]},${c[1]},${c[2]})`
         first_div.css("background-color", bg_color)
         first_div.css("color", "black")
         first_div.siblings("div").each(function () {
            Util.set_color($(this), "background-color", style.bg_color)
         });

         for (let div of rest_divs) {
            Util.set_color(div, "background-color", style.bg_color)
            div.siblings("div").each(function () {
               Util.set_color($(this), "background-color", style.bg_color)
            });
            Util.set_color(div, "border-color", style.bg_color)
            div.css("color", "black")
         }
         for (let i = 1; i <= 7; i++) {
            $(`h${i}`).css("color", "black")
         }
         $(`strong`).css("color", "black")

      }

      add_window_scroll_event(settings) {
         if (window.already_scroll_subscribed) return;
         window.already_scroll_subscribed = true
         $(window).on('scroll', function () {
            if ($(window).scrollTop() + 2 > $(document).height() - $(window).height()) {
               let x = Util.jq(settings.next).get(0)
               if (x) x.click();
            }
         }).scroll();
      }

   }

   let script_runner = new ScriptRunner();
   script_runner.preLoad();

   // document.readyState !== 'loading'
   //    ? script_runner.onLoad()
   //    : addEventListener("DOMContentLoaded", () => { script_runner.onLoad(); });
}