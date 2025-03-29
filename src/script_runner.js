import { delay } from "./util/common.js"
import { IntervalRunner } from "./reader_mode/interval_runner.js"

export const mutation_modes = {
   each_mutation: "each_mutation",
   once_per_bunch: "once_per_bunc"
}

export class ScriptRunner {
   constructor({ name, onLoad, onMutation, onError, onUrlUpdate, mutation_mode = mutation_modes.each_mutation }) {
      this.onLoad = onLoad
      this.onError = onError
      this.onMutation = onMutation
      this.onUrlUpdate = onUrlUpdate
      this.name = name
      this.on = true
      this.last_url = window.location.href
      this.check_delta_ms = 100

      this.script_start = Date.now()
      this.max_wait_ready_ms = 10000
      setTimeout(() => { this.check_url_changed() }, this.check_delta_ms);

      if (mutation_mode === mutation_modes.each_mutation) {
         this.observer = new MutationObserver(
            (mutations) => { this.run_each_mutation(mutations) }
         );
      } else if (mutation_mode === mutation_modes.once_per_bunch) {
         this.observer = new MutationObserver(
            (mutations) => { this.run_mutations_once(mutations) }
         );
         this.is_mutation_blocked = false
         this.mutations_delta_ms = 100
         this.block_occured = false
         setTimeout(() => { this.check_block_occured() }, this.check_delta_ms);
      }
   }

   ob_disconnect() {
      this.observer.disconnect()
   }

   ob_connect() {
      if (!this.on) return
      this.observer.observe(document.body, { childList: true, subtree: true });
   }

   // local storages should be reset to avoid bugs
   async safe_call(call, args = []) {
      try {
         let is_success = await call(...args)
         return is_success
      } catch (err) {
         if (this.onError)
            await this.onError(err)
         throw err
      }
   }

   async run_each_mutation(mutations) {
      this.ob_disconnect();
      for (const mutation of mutations) {
         if (mutation.type !== "childList") continue
         for (const node of mutation.addedNodes) {
            await this.safe_call(this.onMutation, [node])
         }
      }
      this.ob_connect();
   }

   check_block_occured() {
      setTimeout(() => { this.check_block_occured() }, this.check_delta_ms);
      if (!this.block_occured)
         return
      if (this.is_mutation_blocked)
         return
      this.block_occured = false
      this.run_mutations_once()
   }

   async check_url_changed() {
      setTimeout(() => { this.check_url_changed() }, this.check_delta_ms);
      let cur_url = window.location.href
      if (this.last_url === cur_url) return
      this.last_url = cur_url
      if (!this.onUrlUpdate) return

      let is_success = await this.safe_call(this.onUrlUpdate)
      if (is_success && !this.on) {
         this.on = true
         this.ob_connect()
      }
   }

   run_mutations_once(mutations) {
      if (this.is_mutation_blocked) {
         this.block_occured = true
         return
      }
      this.is_mutation_blocked = true

      setTimeout(
         async () => {
            // this.ob_disconnect();
            await this.safe_call(this.onMutation)
            // this.ob_connect();
            this.is_mutation_blocked = false
         },
         this.mutations_delta_ms
      );
   }

   async is_ready() {
      let script_end
      while (!(document && document.body && document.body.clientWidth)) {
         await delay(20)
         script_end = Date.now()
         if (script_end - this.script_start > this.max_wait_ready_ms) {
            console.log(`script_runner ${this.name}: document failed load over ${script_end - this.script_start} ms`);
            return false
         }
      }
      if (script_end - this.script_start > 1000)
         console.log(`script_runner ${this.name}: document load over ${script_end - this.script_start} ms`);

      return true
   }

   async run() {
      let is_ready = await this.is_ready()
      if (!is_ready) return
      await this.safe_call(this.onLoad)

      this.ob_connect()
   }

   stop() {
      this.on = false
      this.ob_disconnect()
   }

}