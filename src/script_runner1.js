import { delay } from "./util/common.js"

export const run_modes = {
   each_mutation: "each_mutation",
   once_per_bunch: "once_per_bunch"
}

class CallChain {
   constructor() {
      this._calls = {}
      this._wrapped_calls = {}
   }

   add_calls(calls) {
      for (let [call_name, objs] of Object.entries(calls)) {
         this.add_call(call_name, objs)
      }
   }

   add_call(call_name, objs) {
      if (!this._wrapped_calls[call_name]) {
         this._wrapped_calls[call_name] = true
         this._calls[call_name] = new Set()
         this.wrap_call(call_name)
      }
      for (let obj of objs) {
         this._calls[call_name].add(obj)
      }
   }

   wrap_call(call_name) {
      if (!this[call_name])
         console.error(`function ${call_name} not exists for ${this}`);
      this[call_name] = (...args) => {
         for (let obj of this._calls[call_name]) {
            if (!obj[call_name])
               console.error(`function ${call_name} not exists for ${obj}`);
            obj[call_name](...args)
         }
         this[call_name](...args)
      }
   }
}

export class Script {
   constructor(name, run_mode) {
      this.on = true
      this.name = name
      this.run_mode = run_mode
   }

   on() { this.on = true }
   off() { this.on = false }
   turn_on_off() { this.on = !this.on }
}

// script support: onLoad, onMutation, onUrlUpdate, onError
export class ScriptRunner {
   constructor({ script, name, mutation_mode = mutation_modes.each_mutation }) {
      this.script = script
      this.name = name
      this.on = script.on

      this.last_url = window.location.href
      this.update_delta_ms = 200

      this.script_start = Date.now()
      this.max_wait_ready_ms = 10000
      setTimeout(() => { this.update() }, this.update_delta_ms);

      if (mutation_mode === mutation_modes.each_mutation) {
         this.observer = new MutationObserver(
            (mutations) => { this.run_each_mutation(mutations) }
         );
      } else if (mutation_mode === mutation_modes.once_per_bunch) {
         this.runMutationsOnceCall = () => { this.run_mutations_once() }
         this.observer = new MutationObserver(this.runMutationsOnceCall);
         this.min_wait_after_mutation_ms = 200
         this.max_wait_after_mutation_ms = 1000
         this.last_mutation_time = null
         this.last_mutation_runned = null
         this.is_mutation_delayed = false
      }
   }

   async update() {
      setTimeout(() => { this.update() }, this.update_delta_ms);
      await this.check_url()
      if (this.on === this.script.on) return
      if (this.script.on) {
         this.on = true
         await this.ob_connect()
      } else {
         this.on = false
         this.ob_disconnect()
      }
   }

   async check_url() {
      let cur_url = window.location.href
      if (this.last_url === cur_url) return
      this.last_url = cur_url
      this.run_once_more = false
      // if (this.is_mutation_ready)
      setTimeout(this.runMutationsOnceCall, 300)
      await this.safe_call('onUrlUpdate')
   }

   ob_disconnect() {
      this.observer.disconnect()
   }

   async ob_connect() {
      if (!this.on) return
      this.script_start = Date.now()
      let is_ready = await this.is_ready()
      if (!is_ready) return
      this.observer.observe(document.body, { childList: true, subtree: true });
   }

   // local storages should be reset to avoid bugs
   async safe_call(call, args = []) {
      if (!this.script[call]) return
      try {
         await this.script[call](...args)
      } catch (err) {
         if (!this.script.onError) return
         await this.script.onError(err)
         throw err
      }
   }

   async run_each_mutation(mutations) {
      this.ob_disconnect();
      for (const mutation of mutations) {
         if (mutation.type !== "childList") continue
         for (const node of mutation.addedNodes) {
            await this.safe_call('onMutation', [node])
         }
      }
      await this.ob_connect();
   }

   is_mutation_ready(cur_time = Date.now()) {
      let res = false
      if (!this.last_mutation_time) {
         this.last_mutation_time = cur_time
         this.last_mutation_time = cur_time
         return true
      }
      if (cur_time - this.last_mutation_runned > this.max_wait_after_mutation)
         res = true
      else if (cur_time - this.last_mutation_time > this.min_wait_after_mutation_ms)
         res = true
      this.last_mutation_time = cur_time
      return res
   }

   async run_mutations_once(mutations) {
      let cur_time = Date.now()
      let is_ready = this.is_mutation_ready(cur_time)
      // console.log(`run_mutations_once ${this.name}`)
      if (!is_ready) {
         // console.log(`not ready ${this.name}`)
         if (this.is_mutation_delayed)
            return
         setTimeout(this.runMutationsOnceCall, this.min_wait_after_mutation_ms)
         this.is_mutation_delayed = true
         return
      }
      if (!this.run_once_more) {
         this.run_once_more = true
         setTimeout(this.runMutationsOnceCall, 200)
      }
      this.is_mutation_delayed = false
      // console.log(`+ ${cur_time - this.script_start}`)
      this.ob_disconnect();
      await this.safe_call('onMutation')
      await this.ob_connect();
   }

   async is_ready() {
      let script_end
      while (!(document && document.body && document.body.clientWidth)) {
         await delay(20)
         script_end = Date.now()
         if (script_end - this.script_start > this.max_wait_ready_ms) {
            return false
         }
      }
      if (script_end - this.script_start > 2000)
         console.log(`script_runner ${this.name}: document load over ${script_end - this.script_start} ms`);

      return true
   }

   async run() {
      let is_ready = await this.is_ready()
      if (!is_ready) return
      await this.safe_call('onLoad')
      if (!this.script.on) return
      await this.ob_connect()
   }

}