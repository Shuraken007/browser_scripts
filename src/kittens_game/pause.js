// pause on user actions click or scroll

export class Pause {
   constructor(delta_ms = 10 * 1000, click_ms = 30) {
      this.delta_ms = delta_ms
      this.click_ms = click_ms

      this.is_click_expected = false
      this.click_exected_ms = 0
      this.pause_started = 0

      this.subscribe()
   }

   subscribe() {
      document.addEventListener("click", () => { this.onClick() });
      window.addEventListener("scroll", () => { this.onScroll() }, true);
   }

   click_expected() {
      this.is_click_expected = true
      this.click_exected_ms = Date.now()
   }

   onClick() {
      let cur = Date.now()
      if (cur - this.click_exected_ms > this.click_ms) {
         this.is_click_expected = false
      }
      if (this.is_click_expected) {
         this.is_click_expected = false
         return
      }
      this.pause_started = cur
   }

   onScroll() {
      let cur = Date.now()
      this.pause_started = cur
   }

   is_pause() {
      let cur = Date.now()
      if (cur - this.pause_started > this.delta_ms) {
         return false
      }
      return true
   }

}