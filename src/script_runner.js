import { delay } from "./util.js"

export const mutation_modes = {
   each_mutation: "each_mutation",
   once_per_bunch: "once_per_bunc"
}

export class ScriptRunner {
   constructor({ name, onLoad, onMutation, mutation_mode = mutation_modes.each_mutation }) {
      this.onLoad = onLoad
      this.onMutation = onMutation
      this.name = name

      if (mutation_mode === mutation_modes.each_mutation) {
         this.observer = new MutationObserver(
            mutations => this.run_each_mutation(mutations)
         );
      } else if (mutation_mode === mutation_modes.once_per_bunch) {
         this.observer = new MutationObserver(
            mutations => this.run_mutations_once(mutations)
         );
         this.is_mutation_blocked = false
         this.mutations_delta_ms = 100
      }
      this.script_start = Date.now()
      this.max_wait_ready_ms = 10000
   }

   ob_disconnect() {
      this.observer.disconnect()
   }

   ob_connect() {
      this.observer.observe(document.body, { childList: true, subtree: true });
   }

   async run_each_mutation(mutations) {
      this.ob_disconnect();
      for (const mutation of mutations) {
         if (mutation.type !== "childList") continue
         for (const node of mutation.addedNodes) {
            await this.onMutation(node);
         }
      }
      this.ob_connect();
   }

   run_mutations_once(mutations) {
      if (this.is_mutation_blocked) return
      this.is_mutation_blocked = true

      setTimeout(
         async () => {
            this.ob_disconnect();
            await this.onMutation();
            this.ob_connect();
            this.is_mutation_blocked = false
         },
         this.mutations_delta_ms
      );
   }

   async is_ready() {
      let script_end
      while (!(document && document.body)) {
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

      await this.onLoad()

      this.ob_connect()
   }
}