// ==UserScript==
// @name         abyss bot
// @version      0.1
// @license MIT
// @description  click bot for abyss idle miner
// @author       Shuraken007

// @include https://html-classic.itch.zone/html/6593103/index.html?v=1732313687

// ==/UserScript==
{

   async function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
   }


   class ClickDetector {
      constructor(node, configs_arr) {
         this.node = node
         this.configs_arr = configs_arr
         this.onEventCall = (event) => { this.onEvent(event) }
      }

      start() {
         this.node.addEventListener('pointerup', this.onEventCall, false);
      }

      onEvent(event) {
         if (!event.isTrusted) return
         let x = event.clientX
         let y = event.clientY
         for (let c of this.configs_arr) {
            if (x >= c.x && x <= c.x + c.w && y >= c.y && y <= c.y + c.h) {
               c.call(event)
               break
            }
         }
      }
   }

   class RockClicker {
      constructor(node, delta) {
         this.node = node
         this.x_pct = 1 / 6.0
         this.y_pct = 1 / 2.0
         this.delta = delta

         this.last_event_down = null
         this.last_event_up = null
         this.last_coords_hash = 0

         this.on = false
      }

      turn_on_off() {
         this.on = !this.on
      }

      get_node_coords() {
         let rect = this.node.getBoundingClientRect();
         let h = rect.bottom - rect.top
         let w = rect.right - rect.left
         let x = rect.left
         let y = rect.top
         let coords = { h: h, w: w, x: x, y: y }
         return coords
      }

      async click() {
         if (!this.on) return
         let coords = this.get_node_coords()
         let x = Math.round(coords.x + coords.w * this.x_pct)
         let y = Math.round(coords.y + coords.h * this.y_pct)
         let [event_down, event_up] = this.get_events(x, y)
         this.node.dispatchEvent(event_down)
         await delay(this.delta)
         this.node.dispatchEvent(event_up)
      }

      get_events(x, y) {
         if (x + y === this.last_coords_hash && this.last_event_down && this.last_event_up) {
         } else {
            this.last_coords_hash = x + y
            this.last_event_down = new PointerEvent("pointerdown", {
               pointerType: 'mouse', pointerId: 100,
               button: 0, buttons: 1,
               clientX: x, clientY: y
            })
            this.last_event_up = new PointerEvent("pointerup", {
               pointerType: 'mouse', pointerId: 100,
               button: 0, buttons: 0,
               clientX: x, clientY: y
            })
         }
         return [this.last_event_down, this.last_event_up]
      }
   }

   async function main() {
      await (3000)
      let canvas = document.getElementById('canvas')
      let delta = 5
      rock = new RockClicker(canvas, delta)
      click_detector = new ClickDetector(canvas, [
         { x: 0, y: 0, w: 30, h: 30, call: () => { rock.turn_on_off() } }
      ])
      click_detector.start()
      while (true) {
         await delay(delta)
         await rock.click(canvas)
      }
   }

   main()
};