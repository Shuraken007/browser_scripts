// ==UserScript==
// @name         mass bot
// @version      0.1
// @license MIT
// @description  click bot for mass incremental
// @author       Shuraken007

// @include https://mrredshark77.github.io/incremental-mass-rewritten/

// ==/UserScript==
{

   async function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
   }

   async function corrupt() {
      reset_res_btn('corrupt')
      await delay(3000)
      reset_res_btn('corrupt')
   }

   let elements_to_upg_selector =
      '#elements_table button.elements:not(.locked):not(.bought)[style*="visibility: visible"]'

   function buy_table() {
      let elements = document.querySelectorAll(elements_to_upg_selector)
      elements.forEach(x => x.click())
   }

   let quantum_btn_selectors =
      'button.btn_tree:not(.locked):not(.corrupted)[style*="visibility: visible"]'
   async function buy_quantum_upg() {
      let elements = document.querySelectorAll(quantum_btn_selectors)
      elements.forEach(x => { x.click(); x.click() })
      if (elements && elements.length > 0) {
         await delay(100)
         buy_quantum_upg()
      }
   }

   function buy_chargers() {
      for (let i = 0; i < 8; i++) {
         buyCharger(i)
      }
   }

   function buy_exotic_tier() {
      EXOTIC_ATOM.tier()
   }

   async function auto_challenges() {
      if (tmp.c16active) return
      CHALS.choose(13)
      enterChal()
      await delay(1000)
      CHALS.choose(14)
      enterChal()
      await delay(1000)
      CHALS.choose(15)
      enterChal()
      await delay(1000)
      CHALS.exit()
      FERMIONS.choose(0, 6)
      await delay(1000)
      FERMIONS.choose(1, 6)
      await delay(1000)
      FERMIONS.backNormal()
   }

   function add_ffs() {
      let ffs_str = document.querySelector('#fss_res_desc').textContent
      if (ffs_str.match(/\d+\(\+0\)/)) return
      reset_res_btn('fss')
   }

   function reset_btn() {
      BEYOND_RANKS.reset()
   }

   function activate_dilation() {
      if (player.md.break.active) return
      MASS_DILATION.break.toggle()
   }

   async function start() {
      let qu_desc = document.querySelector('#qu_res_desc')
      if (!(qu_desc.childNodes[0].textContent === "0") && ((qu_desc.childNodes[2].textContent !== "(+0)")))
         return
      reset_res_btn('qu')
      await delay(1000)
   }

   let map_class_to_color = {
      'mass': 'white',
      'bh': 'yellow',
      'time': 'red',
      'proto': 'green',
      'atom': 'blue',
   }

   let th_max_lvl = 0

   function parse_tooltip(node) {
      let tooltip = node.getAttribute('tooltip-html')
      let spec = {}

      let power = node.querySelector('.c_pow').textContent
      spec.power = parseInt(power.replace('%', ''))

      let level = node.querySelector('.c_lvl').textContent
      spec.level = parseInt(level)
      th_max_lvl = Math.max(th_max_lvl, spec.level)

      let match
      if (match = tooltip.match(/<br class='line'>\n(.+)\(Based on.+\)/s)) {
         let line = match[1]
         let arr = line.split('<br>').filter(Boolean)
         spec.size = arr.length
         spec.rest = arr
      }
      spec.color = map_class_to_color[node.classList[2]]
      spec.node = node
      return spec
   }

   function click_yes() {
      // let yes_btn = [...document.querySelectorAll('.popup .btn')].filter(btn => btn.textContent === 'Yes')[0]
      let popup_btns = document.querySelectorAll('.popup .btn')
      if (!popup_btns) return
      let yes_btns = [...document.querySelectorAll('.popup .btn')].filter(btn => btn.textContent === 'Yes')
      if (!yes_btns) return
      if (yes_btns.length < 1) return
      yes_btns[0].click()
      // yes_btn.click()
   }

   function is_theorem_better(a, b) {
      if (a.size > b.size) return true
      if (b.size > a.size) return false
      if (a.level > b.level) return true
      if (b.level > a.level) return false
      if (a.power > b.power) return true
      if (b.power > a.power) return false
      return false
   }

   function get_core_theorems() {
      let core_theorems = {}
      let max_lvl = 0
      let max_size = 0

      document.querySelectorAll('#theorem_table .theorem_div.tooltip:not([style*="display: none"])')
         .forEach(th => {
            let spec = parse_tooltip(th);
            core_theorems[spec.color] = spec;
            max_lvl = Math.max(max_lvl, spec.level)
            max_size = Math.max(max_size, spec.size)
         })
      core_theorems.level = max_lvl
      core_theorems.size = max_size
      return core_theorems
   }

   async function clear_fragments() {
      let inv_theorems = []
      document.querySelectorAll('#theorem_inv_table .theorem_div.tooltip')
         .forEach(th => inv_theorems.push(parse_tooltip(th)))

      let core_theorems = get_core_theorems()
      for (let theorem of inv_theorems) {
         let core_theorem = core_theorems[theorem.color]
         if (is_theorem_better(theorem, core_theorem)) {
            core_theorem.node.click()
            await delay(100)
            theorem.node.click()
            await delay(100)
            click_yes()
            await delay(100)
         } else {
            theorem.node.click()
            await delay(100)
            document.querySelector('#formTBtn').click()
            // removeTheorem()
            click_yes()
            await delay(100)
         }
      }
   }

   async function reset_infinity() {
      TABS.choose(8)
      await delay(200)
      let sel_theorems = []
      document.querySelectorAll('#pre_theorem .theorem_div.tooltip')
         .forEach(th => sel_theorems.push(parse_tooltip(th)))
      sel_theorems.sort((a, b) => b.size - a.size)

      let core_theorems = get_core_theorems()
      let is_max_size = sel_theorems[0].size >= core_theorems.size

      while ((core_theorems.level - sel_theorems[0].level > 1) ||
         (is_max_size && sel_theorems[0].level < th_max_lvl)) {
         // console.log('wait')
         await delay(1000)
         sel_theorems = []
         document.querySelectorAll('#pre_theorem .theorem_div.tooltip')
            .forEach(th => sel_theorems.push(parse_tooltip(th)))
         sel_theorems.sort((a, b) => b.size - a.size)
         is_max_size = sel_theorems[0].size >= core_theorems.size
      }

      for (let theorem of sel_theorems) {
         let core_theorem = core_theorems[theorem.color]
         if (is_theorem_better(theorem, core_theorem)) {
            theorem.node.click()
            await delay(100)
            break
         }
      }
      reset_res_btn('inf')
   }

   function parse_num(str) {
      let match
      if (match = str.match(/^\((.+)\)$/)) {
         str = match[1]
      }
      str = str.replace(/,/g, '')
      return Number(str)
   }

   function get_inf_num() {
      let num_str = [...document.querySelector('#inf_res_desc').childNodes].filter(e => e.nodeType === 3)[1].textContent
      return parse_num(num_str)
   }

   let is_infinity_running = false
   async function infinity(step = 10, delta = 1000) {
      if (is_infinity_running) return

      is_infinity_running = true

      while (true) {
         let in_a = get_inf_num()
         await delay(delta)
         let in_b = get_inf_num()
         if (in_b / in_a < 1 + step / 100)
            break
      }
      await reset_infinity()
      is_infinity_running = false
   }

   class FuncRunner {
      constructor(config) {
         this.config = config
         this.intervals = {}
      }

      on(id = -1) {
         if (id === -1) {
            for (let [i, item] of this.config.entries()) {
               if (this.intervals[i]) continue
               this.intervals[i] = setInterval(item.call, item.delta)
            }
         } else {
            id -= 1
            if (this.intervals[id]) return
            let item = this.config[id]
            this.intervals[id] = setInterval(item.call, item.delta)
         }
      }

      off(id = -1) {
         if (id === -1) {
            for (let [i, interval] of Object.entries(this.intervals)) {
               clearInterval(interval)
               delete this.intervals[i]
            }
         } else {
            id -= 1
            if (!this.intervals[id]) return
            clearInterval(this.intervals[id])
            delete this.intervals[id]
         }
      }
   }

   let func_runner = null
   async function main() {
      while (!document.querySelector('#loading[style*="display: none"]')) {
         await delay(1000)
      }
      let config = [
         { call: infinity, delta: 1000 },
         { call: clear_fragments, delta: 30000 },
      ]
      func_runner = new FuncRunner(config)
      on();
      infinity();
   }
   main()
   off = (id) => { func_runner.off(id) }
   on = (id) => { func_runner.on(id) }
   cf = clear_fragments
   r = reset_infinity
   ri = infinity
}