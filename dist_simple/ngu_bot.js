// ==UserScript==
// @name         kongregate bot
// @version      0.1
// @license MIT
// @description  bot for kongregate game
// @author       Shuraken007

// @include https://www.kongregate.com*/games/*/*

// ==/UserScript==
{

   async function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
   }

   class FuncRunner {
      constructor(config) {
         this.config = config
         this.intervals = {}
         this.is_pause = false
         this.paused_aliases = []
      }

      on(alias = null) {
         if (!alias) {
            for (let [alias, item] of this.config.entries()) {
               for (let { call, delta } of item) {
                  if (this.intervals[alias]) continue
                  this.intervals[alias] = setInterval(call, delta)
               }
            }
         } else {
            if (this.intervals[alias]) return
            let item = this.config[alias]
            this.intervals[alias] = setInterval(item.call, item.delta)
         }
      }

      off(alias = null) {
         if (!alias) {
            for (let [alias, interval] of Object.entries(this.intervals)) {
               clearInterval(interval)
               delete this.intervals[alias]
            }
         } else {
            if (!this.intervals[alias]) return
            clearInterval(this.intervals[alias])
            delete this.intervals[alias]
         }
      }

      pause() {
         if (!this.is_pause) {
            this.is_pause = true
            for (let alias of Object.keys(this.intervals)) {
               this.paused_aliases.push(alias)
               this.off(alias)
               console.log(`off ${alias}`)
            }
            this.reset_pause()
         } else {
            this.is_pause = false
            for (let alias of this.paused_aliases) {
               this.on(alias)
               console.log(`on ${alias}`)
            }
            this.paused_aliases = []
         }
      }

      async reset_pause() {
         await delay(10000)
         this.is_pause = false
         this.paused_aliases = []
      }
   }

   function calc_full_size(k) {
      let w = window.innerWidth;
      let rect = document.body.getBoundingClientRect()// please check for browser compatibility
      let h = Math.min(rect.height - rect.y, window.innerHeight);
      if (h * k > w) {
         return { w: w, h: ~~(w / k) }
      } else {
         return { w: ~~(h * k), h: h }
      }
   }

   function clean_page() {
      document.querySelector('#fullscreen_button')?.parentNode.parentNode.remove()
      document.querySelectorAll('a[href="/"]')[1]?.parentNode.parentNode.parentNode.parentNode.parentNode.remove()
      document.querySelector('section[aria-labelledby="related-games-heading"]').remove()
      document.querySelector('footer').remove()
      document.querySelector('header').remove()
      document.querySelector('div.h-\\[52px\\]')?.remove()
      document.querySelector('div[data-controller="modern-ads"]')?.remove()
   }

   function change_size() {
      let full_size = calc_full_size(960 / 600)
      let w = full_size.w
      let h = full_size.h
      let game_wrapper = document.querySelector('div[data-previews--game-controls-target="gameWrapper"]')
      let cssText = game_wrapper.style.cssText
      cssText = cssText.replaceAll("960", w)
      cssText = cssText.replaceAll("600", h)
      console.log(cssText)
      game_wrapper.style.cssText = cssText

      let controller = document.querySelector('div[data-controller]')
      controller.setAttribute("data-previews--game-controls-game-width-value", w)
      controller.setAttribute("data-previews--game-controls-max-game-width-value", w)
      controller.setAttribute("data-previews--game-controls-game-height-value", h)
      controller.setAttribute("data-previews--game-controls-max-game-height-value", h)

   }

   function remove_extra_height() {
      let full_size = calc_full_size(960 / 600)
      let h = full_size.h
      document.querySelector('main').classList.remove("pt-4")
      document.querySelector('main').classList.remove("pb-2")
      document.querySelector('main').style.cssText += `max-height: ${h}px`
      document.querySelector('div[data-controller="previews--game-controls"]').classList.remove("mb-1")
   }

   async function wait_start(selector) {
      let res
      while (!(res = document.querySelector(selector))) {
         await delay(1000)
      }
      return res
   }

   function simulateKeyPress(node, key, keyCode) {
      // Create a new KeyboardEvent
      const event = new KeyboardEvent('keydown', {
         key: key, // The key value for the right arrow key
         code: key, // The code value for the right arrow key
         keyCode: keyCode, // Deprecated, but still widely used for compatibility
         which: keyCode, // Deprecated, but still widely used for compatibility
         bubbles: true, // Allow the event to bubble up the DOM tree
         cancelable: true // Allow the default action to be prevented
      });

      // Dispatch the event on the target element
      node.dispatchEvent(event);
   }

   async function skip_description() {
      await delay(1000)
      let canvas_node = document.querySelector('#\\#canvas')
      for (let i = 0; i < 10; i++) {
         simulateKeyPress(canvas_node, 'ArrowRight', 39)
         await delay(10000)
      }
   }

   // You can also dispatch the event on the document body or window
   // simulateRightArrowKeyPress(document.body);
   // simulateRightArrowKeyPress(window);

   let func_runner = null
   async function main() {
      let play_now = await wait_start('button[aria-label="Play NGU IDLE now"]:not(.opacity-50)')
      clean_page()
      change_size()
      remove_extra_height()
      play_now.click()
      let config = {
         // job: { call: () => money_farming.run(), delta: 1000 },
      }
      func_runner = new FuncRunner(config)
   }
   main()
   off = (alias) => { func_runner.off(alias) }
   on = (alias) => { func_runner.on(alias) }

   // f = "f";
   // let old_f = f;
   // setInterval(() => { if (f === old_f) return; old_f = f; s() }, 1000);

   // s = () => { off(); on("job"); on(f); on("pot") }
   // s()
}