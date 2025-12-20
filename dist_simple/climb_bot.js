// ==UserScript==
// @name         climb bot
// @version      0.1
// @license MIT
// @description  bot for climb game
// @author       Shuraken007

// @include https://tomlipo.github.io/the-climb/

// ==/UserScript==
{

   async function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
   }

   function is_text_match(str, str_or_reg) {
      if (str_or_reg.includes("*") || str_or_reg.includes("+")) {
         return new RegExp(str_or_reg, 'i').test(str)
      } else {
         return str.trim() === str_or_reg.trim()
      }
   }

   function get_btn_by_sel_and_text(selector, text) {
      let btns = document.querySelectorAll(selector)
      if (!btns) return null
      btns = [...btns]
      for (let btn of btns) {
         if (!btn.textContent) continue
         if (!is_text_match(btn.textContent, text)) continue
         return btn
      }
      return null
   }

   function get_bar_pct(color) {
      let bar = document.querySelector(`.progress-bar-wrapper.${color} .progress-bar`)
      if (!bar) return null
      let width = bar.style.width
      if (!width) return null
      return parseInt(width)
   }

   function is_full_hp() {
      return get_bar_pct('red') === 100
   }

   function is_night() {
      return document.querySelector(".time-icon[src='/the-climb/img/night.png']")
   }

   async function run_farm(config) {
      for (let { sel, text, condition } of config) {
         let btn = get_btn_by_sel_and_text(sel, text)
         if (!btn) continue
         if (condition && await !condition()) continue
         btn.click()
         return
      }
      await delay(30)
   }

   function get_item_spec(item) {
      let spec = { item: item, amount: null, name: '', is_equipped: false }
      let amount = item.querySelector('.amount')?.textContent.trim()
      if (amount)
         spec.amount = parseInt(amount)
      spec.name = item.querySelector('.image').getAttribute('alt').trim()
      spec.img_src = item.querySelector('.image').getAttribute('src')
      spec.is_equipped = item.classList.contains('equipped')
      return spec
   }

   function is_same_item_name(item, name) {
      let new_name = item?.querySelector('.image')?.getAttribute('alt')?.trim()
      if (!new_name) return false
      return new_name === name
   }

   function find_items(name) {
      let res = []
      let items = document.querySelectorAll('.inventory-list div.item')
      if (!items) return null
      items = [...items]
      for (let item of items) {
         let spec = get_item_spec(item)
         if (is_text_match(spec.name, name))
            res.push(spec)
      }
      return res
   }

   async function consume_all() {
      let items = ['Scroll .+', 'Dry Bread', '.+Meat', 'Water', '.+Potion']
      for (let item of items)
         consume_all_item(item)
   }

   async function consume_all_item(name) {
      let specs = find_items(name)
      if (!specs) return
      for (let spec of specs) {
         use_item_till_end(spec)
      }
   }

   async function use_item_till_end(spec) {
      let amount = spec.amount
      if (!amount) return
      while (amount > 0) {
         if (!is_same_item_name(spec.item, spec.name)) return
         spec.item.click()
         await delay(10)
         amount -= 1
         let cd = 0
         if (cd = spec.item.querySelector('.cooldown-overlay')?.textContent) {
            cd = parseInt(cd) * 1000
            await delay(cd)
         }
      }
   }

   class MoneyFarming {
      constructor(exlude_items = []) {
         this.exlude_items = exlude_items.map(e => e.toLowerCase())
         this.is_running = false
      }

      async open_job_board() {
         for (let i = 0; i < 10; i++) {
            await run_farm([
               { sel: '.option.leave', text: 'Get up' },
               { sel: '.option.leave', text: 'Leave Home' },
               { sel: '.option.enter', text: "Adventurers' Guild" },
               { sel: '.option.enter', text: 'Check job board' },
            ])
         }
      }

      async finish_job() {
         for (let i = 0; i < 10; i++) {
            await run_farm([
               { sel: '.option.leave', text: 'Leave Job board' },
               { sel: '.option.enter', text: "Finish job requests" },
            ])
         }
         await delay(30)
         document.querySelector('.btn.complete-all').click()
      }

      async leave() {
         for (let i = 0; i < 10; i++) {
            await run_farm([
               { sel: '.option.leave', text: 'Return to City' },
               { sel: '.option.leave', text: 'Leave *' },
            ])
         }
      }

      async sleep_till_morning() {
         for (let i = 0; i < 10; i++) {
            await run_farm([
               { sel: '.option.enter', text: "Home" },
               { sel: '.option.enter', text: "Sleep" },
               { sel: '.option.leave', text: "Sleep until morning" },
            ])
         }
      }

      check_item(img_src, amount) {
         let items = document.querySelectorAll('.inventory-list div.item')
         if (!items) return false
         items = [...items]
         for (let item of items) {
            let spec = get_item_spec(item)
            if (spec.img_src !== img_src) continue
            if (spec.amount < amount) continue
            if (this.exlude_items.includes(spec.name.toLowerCase())) {
               con5sole.log(`${spec.name} not allowed`)
               continue
            }
            return true
         }
         return false
      }

      accept_quests() {
         // let sel_quests = []
         let quests = document.querySelectorAll('div.quest.G, div.quest.F')
         if (!quests) return
         quests = [...quests]
         let report = []
         for (let quest of quests) {
            let requirments = quest.children[1].querySelectorAll('.list-item')
            if (!requirments) continue
            requirments = [...requirments]

            let req_met = true
            for (let req of requirments) {
               let img_src = req.querySelector('img').getAttribute('src')
               let amount = req.querySelector('.amount')?.textContent.trim()
               if (!amount) { req_met = false; break }
               amount = parseInt(amount)
               if (!this.check_item(img_src, amount)) { req_met = false; break }
               report.push([amount, img_src])
            }
            if (!req_met) continue
            quest.click()
         }
         console.log(report)
      }

      async run() {
         if (!is_night()) return
         if (this.is_running) return
         this.is_running = true
         func_runner.pause()
         await delay(5000)
         await this.leave()
         await this.sleep_till_morning()
         await this.open_job_board()
         await this.accept_quests()
         await this.finish_job()
         await this.leave()
         this.is_running = false
         func_runner.pause()
      }

   }

   function drink_potion(name) {
      let specs = find_items(name)
      if (!specs) return
      let potion = specs[0]?.item
      potion?.click()
   }

   async function potion_support() {
      if (get_bar_pct('red') < 50) {
         drink_potion('.* Healing Potion')
         drink_potion('Dry bread')
         drink_potion('Cooked Meat')
         await delay(20)
      }
      if (get_bar_pct('blue') < 20) {
         drink_potion('Water')
      }
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

   let farm_configs = {
      bear: [
         { sel: '.option.leave', text: 'Leave' },
         { sel: '.option.leave', text: 'Leave Home' },
         { sel: '.option.leave', text: 'Get up', condition: is_full_hp },
         { sel: '.option.enter', text: 'Enter Forest Depths' },
         { sel: '.option.enter', text: 'Cave' },
         { sel: '.option.fight', text: 'Fight the bear' },
         { sel: '.option.enter', text: 'Enter Forest' },
         { sel: '.option.enter', text: 'Forest Outskirts' },
         { sel: '.option.enter', text: 'Go deeper' },
         { sel: '.option.fight', text: 'Hunt' },
      ],
      wolf: [
         { sel: '.option.leave', text: 'Leave Home' },
         { sel: '.option.leave', text: 'Get up', condition: is_full_hp },
         { sel: '.option.enter', text: 'Enter Forest Depths' },
         { sel: '.option.fight', text: 'Hunt indefinitely' },
      ],
      mine: [
         { sel: '.option.leave', text: 'Leave Home' },
         { sel: '.option.leave', text: 'Get up', condition: is_full_hp },
         { sel: '.option.enter', text: 'Enter Forest Depths' },
         { sel: '.option.enter', text: 'Abandoned Mine' },
         { sel: '.option.fight', text: 'Hunt indefinitely' },
         { sel: '.option.fight', text: 'Go deeper (infinite)' },
         { sel: '.option.fight', text: 'Go deeper' },
      ],
      tower1: [
         { sel: '.option.leave', text: 'Leave Home' },
         { sel: '.option.leave', text: 'Get up', condition: is_full_hp },
         { sel: '.option.enter', text: 'Tower' },
         { sel: '.option.enter', text: 'Enter Floor 1' },
         { sel: '.option.fight', text: 'Explore deeper' },
         { sel: '.option.enter', text: 'Open the door' },
         { sel: '.option.fight', text: 'Challenge the Guardian' },
         { sel: '.option.leave', text: 'Go back to the Hallway' },
      ],
      tower2: [
         { sel: '.option.leave', text: 'Leave Home' },
         { sel: '.option.leave', text: 'Get up', condition: is_full_hp },
         { sel: '.option.enter', text: 'Tower' },
         { sel: '.option.enter', text: 'Enter Floor 2' },
         { sel: '.option.fight', text: 'Explore deeper' },
         { sel: '.option.enter', text: 'Open the door' },
         { sel: '.option.fight', text: 'Challenge the Guardian' },
         { sel: '.option.leave', text: 'Go back to the Hallway' },
      ],
      tower3: [
         { sel: '.option.leave', text: 'Leave Home' },
         { sel: '.option.leave', text: 'Get up', condition: is_full_hp },
         { sel: '.option.enter', text: 'Tower' },
         { sel: '.option.enter', text: 'Enter Floor 3' },
         { sel: '.option.fight', text: 'Explore deeper' },
         { sel: '.option.enter', text: 'Open the door' },
         { sel: '.option.fight', text: 'Challenge the Guardian' },
         { sel: '.option.leave', text: 'Go back to the Hallway' },
      ],
      tower4: [
         { sel: '.option.leave', text: 'Leave Home' },
         { sel: '.option.leave', text: 'Get up', condition: is_full_hp },
         { sel: '.option.enter', text: 'Tower' },
         { sel: '.option.enter', text: 'Enter Floor 4' },
         { sel: '.option.fight', text: 'Explore deeper' },
         { sel: '.option.enter', text: 'Open the door' },
         { sel: '.option.fight', text: 'Challenge the Guardian' },
         { sel: '.option.leave', text: 'Go back to the Hallway' },
      ],
      tower5: [
         { sel: '.option.leave', text: 'Leave Home' },
         { sel: '.option.leave', text: 'Get up', condition: is_full_hp },
         { sel: '.option.enter', text: 'Tower' },
         { sel: '.option.enter', text: 'Enter Floor 5' },
         { sel: '.option.fight', text: 'Explore deeper' },
         { sel: '.option.enter', text: 'Open the door' },
         { sel: '.option.fight', text: 'Challenge the Guardian' },
         { sel: '.option.leave', text: 'Go back to the Hallway' },
      ],
      tmp: [
         { sel: '.option.leave', text: 'Leave Home' },
         { sel: '.option.leave', text: 'Get up', condition: is_full_hp },
         { sel: '.option.enter', text: 'Tower' },
         { sel: '.option.enter', text: 'Enter Floor 5' },
         { sel: '.option.fight', text: 'Fight indiscriminately' },
      ],
   }

   let money_farming = new MoneyFarming([
      'Wool', 'Spider Silk',
   ])

   let func_runner = null
   async function main() {
      while (!document.querySelector('#app .page-wrapper .container .tabs')) {
         await delay(1000)
      }

      let config = {
         job: { call: () => money_farming.run(), delta: 1000 },
         b1: { call: () => run_farm(farm_configs.boss1), delta: 500 },
         t1: { call: () => run_farm(farm_configs.tower1), delta: 500 },
         t2: { call: () => run_farm(farm_configs.tower2), delta: 500 },
         t3: { call: () => run_farm(farm_configs.tower3), delta: 500 },
         t4: { call: () => run_farm(farm_configs.tower4), delta: 500 },
         t5: { call: () => run_farm(farm_configs.tower5), delta: 500 },
         bear: { call: () => run_farm(farm_configs.bear), delta: 40 },
         wolf: { call: () => run_farm(farm_configs.wolf), delta: 500 },
         mine: { call: () => run_farm(farm_configs.mine), delta: 500 },
         tmp: { call: () => run_farm(farm_configs.tmp), delta: 500 },
         pot: { call: potion_support, delta: 1000 },
      }
      func_runner = new FuncRunner(config)
   }
   main()
   off = (alias) => { func_runner.off(alias) }
   on = (alias) => { func_runner.on(alias) }
   cai = consume_all_item
   mf = money_farming
   p = () => func_runner.pause()
   c = consume_all

   f = "t4";
   let old_f = f;
   setInterval(() => { if (f === old_f) return; old_f = f; s() }, 1000);

   s = () => { off(); on("job"); on(f); on("pot") }
   s()
}