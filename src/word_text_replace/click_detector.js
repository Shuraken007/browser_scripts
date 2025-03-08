//   how ClickDetector works:
//   it get n, m values from config
//   and splited screen on n*m rectangles
//   each rectangle get it's own number
//   left-> right, up->down
// 
//   n = 3, m = 2:
// 
//   -------------
//   | 1 | 2 | 3 |
//   |---|---|---|
//   | 4 | 5 | 6 |
//   -------------
// 
//   you setup click_interval
//   and any chain of blocks:
//   [1, 3, 6, 4] or [1, 1, 2, 2, 5, 5, 4, 4]
//   if last clicks are same as you expected in chain: 
//      event fired
//

export class ClickDetector {
   constructor(n, m, click_interval, config) {
      this.n = n;
      this.m = m;
      this.click_interval = click_interval;
      this.s = [];
      this.config = config
   }

   get_index(event) {
      let x = event.clientX;
      let y = event.clientY;
      let w = window.innerWidth;
      let h = window.innerHeight;
      let i = ~~(x / ~~(w / this.n));
      let j = ~~(y / ~~(h / this.m));
      return j * this.n + i;
   }

   clean_array(min_val) {
      this.s = this.s.filter(x => x[0] >= min_val)
   }

   on_click(event) {
      // console.log(event)
      let index = this.get_index(event);
      let cur_time = Date.now();
      this.clean_array(cur_time - this.click_interval)
      this.s.push([cur_time, index]);

      for (const [indexes, callback] of this.config) {
         if (indexes.length > this.s.length) continue;
         if (!this.is_event_fired(indexes)) continue;
         // console.log('fired');
         this.s = [];
         callback()
         return
      }
   }

   is_event_fired(indexes) {
      let l_diff = this.s.length - indexes.length
      let prev_val;
      for (let i = 0; i < indexes.length; i++) {
         let expected_index = indexes[i] - 1;
         let got_index = this.s[l_diff + i][1]
         if (expected_index != got_index) return false;

         let cur_val = this.s[l_diff + i][0];
         if (prev_val && cur_val < prev_val) return false;
         prev_val = cur_val
      }

      return true;
   }
}