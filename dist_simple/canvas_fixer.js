// ==UserScript==
// @name         canvas fixer
// @version      0.1
// @license MIT
// @description  resize canvas to full page
// @author       Shuraken007

// @include https://*.itch.*
// @include https://galaxy.click*

// ==/UserScript==
{
   async function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
   }

   class ClickDetector {
      constructor(node = document.body, configs_arr) {
         this.node = node
         this.configs_arr = configs_arr
         this.onEventCall = (event) => { this.onEvent(event) }
         console.log(configs_arr)
      }

      start() {
         this.node.addEventListener('click', this.onEventCall, false);
      }

      onEvent(event) {
         if (!event.isTrusted) return
         let x = event.clientX
         let y = event.clientY
         console.log({ x: x, y: y })
         for (let c of this.configs_arr) {
            if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
               c.call()
               break
            }
         }
      }
   }

   class ButtonEmulator {
      constructor(node = document, trigger_click_wait_ms = 2000) {
         this.node = node
         this.trigger_click_wait_ms = trigger_click_wait_ms
         this.onEventCall = (event) => { this.onEvent(event) }

         this.is_pointerdown = false
         this.pointerdown_time = null
         this.is_rbutton_pressed = false
      }

      start() {
         this.node.addEventListener('pointerdown', this.onEventCall, false);
         this.node.addEventListener('pointerup', this.onEventCall, false);
      }

      onEvent(event) {
         if (!event.isTrusted) return
         if (event.type === 'pointerdown') {
            this.is_pointerdown = true
            this.pointerdown_time = Date.now()
         } else if (event.type === 'pointerup') {
            if (!this.is_pointerdown) return
            this.is_pointerdown = false
            if (Date.now() - this.pointerdown_time < this.trigger_click_wait_ms) return
            this.right_click(event.clientX, event.clientY)
         }
      }

      right_click(x, y) {
         let pointer_event = null
         if (this.is_rbutton_pressed) {
            pointer_event = new PointerEvent("pointerdown", {
               pointerType: 'mouse', pointerId: 100,
               button: 2, buttons: 2,
               clientX: x, clientY: y
            })
         } else {
            pointer_event = new PointerEvent("pointerup", {
               pointerType: 'mouse', pointerId: 100,
               button: 2, buttons: 0,
               clientX: x, clientY: y
            })
         }
         this.node.dispatchEvent(pointer_event)
         this.is_rbutton_pressed = !this.is_rbutton_pressed
      }
   }

   function search_embed_game() {
      let iframes = [...document.querySelectorAll('iframe')]
      for (let iframe of iframes) {
         let src = iframe.src
         if (src.endsWith('index.html') || src.includes('.io') || src.includes('itch'))
            return src
      }
      let div_with_frames = [...document.querySelectorAll('div[data-iframe]')]
      for (let div of div_with_frames) {
         let str = div.getAttribute('data-iframe')
         let match = str.match(/<iframe.+src="(http.*?)"/)
         if (match)
            return match[1]
      }

   }

   function are_same_url(url) {
      let location_url = window.location.origin + window.location.pathname
      let comparing_url_obj = new URL(url);
      let comparing_url = comparing_url_obj.origin + comparing_url_obj.pathname
      return location_url === comparing_url
   }

   function run_redirect_mode(src) {
      let click_detector = new ClickDetector(document.body, [
         {
            x: 0, y: window.innerHeight - 30, w: 30, h: 30,
            call: () => { window.location.replace(src) }
         }
      ])
      click_detector.start()
   }

   function run_canvas_fix(canvas) {
      let w1 = canvas.width;  // the resolution the games is designed to look best in
      let h1 = canvas.height;
      let w2 = window.innerWidth;  // please check for browser compatibility
      let h2 = window.innerHeight;

      let w_scale = w2 / w1
      let h_scale = h2 / h1

      let scale = w_scale
      let allowed_delta = 0.05
      if (h1 * scale > h2 * (1 + allowed_delta))
         scale = h_scale

      let context_w = Math.floor(w1 * scale)
      let context_h = Math.floor(h1 * scale)


      let not_touch = "overflow: hidden; touch-action: none; -webkit-touch-callout: none; -webkit-user-select: none; -khtml-user-select: none; -moz-user-select: none; -ms-user-select: none; user-select: none; outline: none; cursor: auto;"
      let size = `width: ${context_w}px; height: ${context_h}px;`
      let pos = "position: absolute; margin:0 auto; padding-left: 0px; padding-right: 0px;"
      canvas.style.cssText = not_touch + size + pos
      // button_emulator = new ButtonEmulator(canvas, 750)
      // button_emulator.start()
   }

   async function main() {
      await delay(1000)
      let url = search_embed_game()
      if (url && !are_same_url(url)) {
         run_redirect_mode(url)
      }
      let canvas = document.getElementById('canvas')
      if (canvas) {
         run_canvas_fix(canvas)
      }
   }

   main()
};