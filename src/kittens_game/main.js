import * as click_util from '../bot/click_util.js'
import { delay, rnd_from_arr } from '../util/common.js'
import { LVL, Log } from '../util/log.js'
import { Pause } from './pause.js';

const CONFIG = {
   delay: 1000,
   delta: 300,
}

const number_abbr = {
   "K": 1000,
   "M": 1000000,
}

function to_number(n) {
   if (!n)
      return
   n = n.replace('/с', '')
   n = n.replace('/', '')
   n = n.replace('(...)', '')
   console.log()
   let abbr_val = 1
   for (let [abbr, val] of Object.entries(number_abbr)) {
      if (n.endsWith(abbr)) {
         n = n.replace(abbr, '')
         abbr_val = val
         break
      }
   }
   n = Number(n)
   n *= abbr_val
   return n
}

class Buildings {
   constructor() {
      this.data = []
   }

   is_spring() {
      return jq('#calendarDiv')[0].textContent.includes('Весна')
   }

   is_active_tab() {
      let node = jq('.tab.Bonfire.activeTab')[0]
      return node
   }

   remove_building(name) {
      let exclude = ['Собрать мяты', 'Спрессовать мяту']
      for (let e_name of exclude)
         if (name.includes(e_name))
            return false

      let exlude_not_spring = ['Поле мяты', 'Пастбище']
      if (!this.is_spring())
         for (let e_name of exlude_not_spring)
            if (name.includes(e_name))
               return false

      return true
   }

   collect() {
      this.data = []
      if (!this.is_active_tab())
         return
      this.data = jq('div.btn.nosel')
         .filter(x => !x.disabled)
         .filter(x => this.remove_building(x.textContent))
   }

   get_random_bulding() {
      if (this.data.length === 0)
         return
      return rnd_from_arr(this.data)
   }
}

class Resources {
   constructor() {
      this.data = {}
   }

   collect() {
      let rows = jq('.res-table[role="grid"] div.res-row')
      if (rows.length === 0)
         return
      for (let row of rows) {
         let name = row.querySelector('.resource-name').textContent
         let amount_div = row.querySelector('.resAmount')
         let is_full = amount_div.classList.contains("resLimitNotice")
         let amount = amount_div.textContent
         amount = to_number(amount)
         let max = row.querySelector('.maxRes').textContent
         max = to_number(max)
         let tick = row.querySelector('.resPerTick').textContent
         tick = to_number(tick)

         this.data[name] = {
            amount: amount,
            max: max,
            tick: tick,
            is_full: is_full
         }
      }
   }

   get_full() {
      let full = []
      for (let [name, config] of Object.entries(this.data)) {
         if (!config.is_full)
            continue
         full.push(name)
      }
      return full
   }
}

class Craft {
   constructor() {
      this.data = {}
   }

   collect() {
      let rows = jq('.res-table.craftTable div.res-row')
      if (rows.length === 0)
         return
      for (let row of rows) {
         let name = row.querySelector('.resource-name').textContent
         let amount = row.querySelector('.resource-value').textContent
         amount = to_number(amount)

         this.data[name] = {
            amount: amount,
            craft_one: row.querySelector('.craft-1pc'),
            craft_five: row.querySelector('.craft-5pc'),
            craft_ten: row.querySelector('.craft-10pc'),
            craft_all: row.querySelector('.craft-link.all'),
         }
      }
   }
}

class Tabs {
   constructor() {
      this.data = {}
      this.active_tab = null
   }

   collect() {
      let tabs = jq('.tabsContainer a.tab')
      if (tabs.length === 0)
         return

      for (let tab of tabs) {
         let name = tab.textContent
         let is_leader = tab.classList.contains("traitLeaderBonus")
         let is_active = tab.classList.contains("activeTab")

         this.data[name] = {
            node: tab,
            is_leader: is_leader,
            is_active: is_active,
         }

         if (is_active)
            this.active_tab = this.data[name]
      }
   }

   select(tab_name) {
      if (this.data[tab_name].is_active)
         return
      return this.data[tab_name].node
   }
}

class Explorer {
   constructor() {
      this.data = {}
      this.is_active = false
   }

   collect() {
      let tabs = jq('.tabsContainer a.tab')
      if (tabs.length === 0)
         return

      for (let tab of tabs) {
         let name = tab.textContent
         let is_leader = tab.classList.contains("traitLeaderBonus")
         let is_active = tab.classList.contains("activeTab")

         this.data[name] = {
            node: tab,
            is_leader: is_leader,
            is_active: is_active,
         }

         if (is_active)
            this.active_tab = this.data[name]
      }
   }
}

class Runner {
   constructor() {
      this.log = new Log(LVL.DEBUG)
      this.resources = new Resources()
      this.craft = new Craft()
      this.buildings = new Buildings()
      this.tabs = new Tabs()
      this.pause = new Pause()
      // this.timers = {}
      this.init_promise = this.init()
   }

   async init() {
      this.config = CONFIG
      while (true) {
         let happiness = jq('.happinessText')
         if (happiness.length > 0)
            break
         await delay(this.config.delay)
      }
   }

   async onReload() {
   }

   async run() {
      while (true) {
         this.resources.collect()
         this.craft.collect()
         this.buildings.collect()
         this.tabs.collect()
         await this.upgrade()
         await this.process_full()
         await this.observe()
         await delay(this.config.delay)
      }
   }

   async click(node, msg = "") {
      if (!nodez)
         return
      this.log.log(`click ${node.textContent} | ${msg}`)
      this.pause.click_expected()
      node.click()
      await delay(this.config.delta)
   }

   async upgrade() {
      if (this.pause.is_pause())
         return
      await this.click(this.tabs.select('Костер'))
      await this.click(this.buildings.get_random_bulding())
      await delay(this.config.delta)
   }

   async process_full() {
      if (this.pause.is_pause())
         return
      let full = this.resources.get_full()
      let call_config = {
         'котосила': 'process_full_catpower',
         'вера': 'process_full_faith',
      }
      let auto_res = {
         'мята': 'дерево',
         'дерево': 'балка',
         'минералы': 'плита',
         'уголь': 'сталь',
         'железо': 'пластина',
         'наука': 'справочник',
         'культура': 'рукопись',
      }
      for (let res_name of full) {
         let craft_name = auto_res[res_name]
         let call = call_config[res_name]
         if (craft_name)
            await this.click_craft(craft_name)
         if (call) {
            await this[call]()
            await delay(this.config)
         }
      }
   }

   async process_full_catpower() {
      await click_util.try_click('a', 'Охотиться', this.log, this.config)
      this.click_craft("свиток")
   }

   async process_full_faith() {
      await click_util.try_click('a', 'Восславить солнце!', this.log, this.config)
   }

   async click_craft(name) {
      let res = this.craft.data[name]
      if (!res)
         return
      let button = null
      for (let btn_name of ["craft_ten", "craft_five", "craft_one"]) {
         if (!res[btn_name] || !res[btn_name].textContent)
            continue
         button = res[btn_name]
         break
      }
      await this.click(button, `clicked craft ${name}`)
   }

   async observe() {
      let btn = jq('#observeBtn')[0]
      await this.click(btn)
   }
}

let runner = new Runner();
await runner.init_promise;
runner.run()

Object.assign(
   unsafeWindow,
   {
      bot: runner,
   }
)