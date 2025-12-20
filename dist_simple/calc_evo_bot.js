// ==UserScript==
// @name         calc evo bot
// @version      0.1
// @license MIT
// @description  click bot for Calculator Evolution
// @author       Shuraken007

// @include https://spotky1004.com/Calculator-Evolution/

// ==/UserScript==
{

   async function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
   }

   function activate_program() {
      for (let i = 0; i < 7; i++) {
         if (game.programActive[i]) continue
         activeProgram(i)
      }
   }

   function inc_research() {
      for (let i = 0; i <= 7; i++)
         researchBuy(i)
   }

   let next_reboot_time = Date.now()
   async function make_reboot() {
      if (rebooting) return
      if (Date.now() < next_reboot_time) return
      next_reboot_time = Date.now() + calcRebootCooldown() * 2
      reboot()
   }

   async function auto_respeck() {
      for (let i = 0; i < 7; i++) {
         await delay(40)
         quantumUpgradeRespec()
      }
   }

   let matrix = [
      [1, 1, 1, 1, 1, 0, 0],
      [0, 0, 0, 1, 1, 0, 0],
      [0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
      [0, 0, 1, 0, 0, 0, 0],
      [0, 0, 0, 0, 0, 0, 0],
   ];

   async function upgrade() {
      await auto_respeck()
      let nodes = [...document.querySelectorAll('#quantumUpgrades .quantumUpgrade')]
      for (let i = 0; i < matrix.length; i++) {
         for (let j = 0; j < matrix[i].length; j++) {
            if (matrix[i][j] === 1) {
               await delay(20)
               buyQuantumUpgrade(i * 7 + j)
            }
         }
      }
   }
   class FuncRunner {
      constructor(config) {
         this.config = config
         this.intervals = []
      }

      on() {
         for (let item of this.config) {
            this.intervals.push(setInterval(item.call, item.delta))
         }
      }

      off() {
         for (let interval of this.intervals) {
            clearInterval(interval)
         }
      }
   }

   let func_runner = null
   async function main() {
      await delay(3000)
      let config = [
         { call: activate_program, delta: 1000 },
         { call: quantum, delta: 1000 },
         { call: make_reboot, delta: 100 },
         { call: inc_research, delta: 100 },
      ]
      func_runner = new FuncRunner(config)
      func_runner.on()
   }
   main()

   // Object.assign(unsafeWindow, {
   off = () => { func_runner.off() }
   on = () => { func_runner.on() }
   ar = auto_respeck
   u = upgrade
   // });

}