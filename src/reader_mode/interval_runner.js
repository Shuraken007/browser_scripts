export class IntervalRunner {
   constructor({ name, interval_min, callback }) {
      this.on = true
      this.is_runned = false
      this.storage_key = `userscript_interval_runner_${name}`
      this.interval_ms = interval_min * 60 * 1000
      this.callback = callback
      this.last_synced = null
      this.init_awaiter = this.init()
   }

   async init() {
      this.last_synced = await localStorage.getItem(this.storage_key) || Date.now()
   }

   onReload({ interval_min = this.interval_min }) {
      this.interval_ms = interval_min * 60 * 1000
   }

   onError() {
      localStorage.removeItem(this.storage_key);
   }

   async run() {
      await this.init_awaiter
      this.on = true
      if (this.is_runned)
         return
      // console.log(`${this.storage_key} runned`)
      // console.log(`last_synced: ${this.last_synced}`)
      setTimeout(() => { this.run_callback() }, this.get_interval());
      this.is_runned = true
   }

   async stop() {
      this.on = false
   }

   get_interval() {
      let diff = Date.now() - this.last_synced
      let remaining_time = this.interval_ms - diff
      if (remaining_time < 0)
         remaining_time = 1
      // console.log(`${this.storage_key} in ${Math.ceil(remaining_time / 1000 / 60)} mins`)
      return remaining_time
   }

   run_callback() {
      if (this.is_runned)
         this.is_runned = false
      if (!this.on)
         return
      this.callback();
      this.last_synced = Date.now();
      localStorage.setItem(this.storage_key, this.last_synced)
      this.run()
   }
}