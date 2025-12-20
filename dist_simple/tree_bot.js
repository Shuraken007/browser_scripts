// ==UserScript==
// @name         grass bot
// @version      0.1
// @license MIT
// @description  click bot for grass idle
// @author       Shuraken007

// @include https://mrredshark77.github.io/Really-Grass-Cutting-Incremental/

// ==/UserScript==
{
   const map_teleport_name_to_index = {
      "grass": 0,
      "anti_grass": 1,
      "unnatur_grass": 2,
      "factory": 3,
      "stars": 4,
   }

   const MY_TELEPORTS = [
      [() => true, "Grass Field", [0, 0], "Bases/GrassBase", "Curr/Grass"],
      [() => tmp.anti_unl, "Anti-Grass Field", [20, 5], "Bases/AntiGrassBase", "Curr/AntiGrass"],
      [() => tmp.unnatural_unl, "Unnatural-Grass Field", [40, 0], "Bases/UnnaturalBase", "Curr/UGrass"],
      [() => tmp.star_unl || player.grasshop.gte(1), "Factory", [0, 12], "Bases/GrasshopBase", "Icons/Charger"],
      [() => tmp.star_unl, "Star Platform", [0, -20], "Bases/SpaceBase", "Curr/Star"],
   ]

   function my_teleportTo(i, force) {
      var tp = MY_TELEPORTS[i]

      if (force || tp[0]()) {
         camera_pos = { x: -tp[2][0] * 250, y: -tp[2][1] * 250 }

         updatePosition()
         drawCanvas()

         updateHTML()
         updateHTMLSecond()
      }
   }

   function teleport(name) {
      let i = map_teleport_name_to_index[name]
      if (i === null)
         error(`no map for ${name}`)
      my_teleportTo(i)
   }

   async function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
   }

   let ban_divs = { "upg-fundry-2-div": true }
   async function try_upgrade(node) {
      if (!node) return
      if (!is_visible(node)) return
      let max_btn = [...node.querySelectorAll('button')].filter(btn => btn.textContent === "Buy Max")[0]
      let cancel_btn = [...node.querySelectorAll('button')].filter(btn => btn.textContent === "Cancel")[0]
      if (!max_btn || !cancel_btn) return
      let divs = [...node.querySelectorAll('.upgrade-div')]
      divs.sort(() => Math.random() - 0.5)
      for (let div of divs) {
         if (ban_divs[div.id]) continue
         let cost = div.querySelector('.upg-cost')
         if (!cost) continue
         if (cost.textContent === 'Maxed' || cost.classList.contains('locked'))
            continue
         let button = div.querySelector('img[onclick]')
         if (!button) continue
         button.click()
         await delay(100)
         max_btn.click()
         await delay(100)
         cancel_btn.click()
      }
   }

   function is_visible(node) {
      if (!node) return
      if (typeof node === 'string')
         node = document.querySelector(node)
      let visibility = node?.style?.visibility
      if (visibility && visibility === 'visible')
         return true
      return false
   }


   let manual_upgrades = [
      "momentum",
      "accumulator",
      "fundry",
      "sfrgt",
      "funny-machine",
      "unnatural-grass",
      "normality",
      // "star-ultimate",
      // "dark-matter",
   ]
   let manual_upgrades_cache = {}
   async function manualAutoUpgrades() {
      for (let grid of manual_upgrades) {
         if (!manual_upgrades_cache[grid]) {
            manual_upgrades_cache[grid] = document.querySelector(`#grid-element-${grid}-upgrades`)
         }
         try_upgrade(manual_upgrades_cache[grid])
      }
   }

   farmg = 3000

   async function main() {
      let config = [
         { call: () => { cutGrass("normal") }, delta: 2350 },
         { call: () => { cutGrass("anti") }, delta: 5000 },
         { call: () => { cutGrass("unnatural") }, delta: 1000 },
         { call: () => { doReset('rocket-part') }, delta: 600 },
         { call: () => { doReset('funify') }, delta: 600 },
         { call: () => { doReset('normality') }, delta: 10 * 60 * 60 * 1000 },
         {
            call: async () => {
               let name = ["anti_grass", "unnatur_grass"].sort(() => Math.random() - 0.5)
               teleport(name[0])
               await delay(100)
               manualAutoUpgrades()
            }, delta: 5000
         },
         { call: manualAutoUpgrades, delta: 1000 },
      ]

      let intervals = []

      for (let item of config) {
         intervals.push(setInterval(item.call, item.delta))
      }
      await delay(3000)

      while (true) {
         teleport("factory")
         await delay(farmg)
         doReset('galactic')
         await delay(200)
      }
   }

   main()
};