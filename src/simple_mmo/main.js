import * as j_util from '../util/jq.js'
import * as click_util from '../bot/click_util.js'
import * as common_util from '../util/common.js'
import { merge_obj, delay } from '../util/common.js'
import { LVL, Log } from '../util/log.js'

const CONFIG = {
   default: {
      delta: 300,
      delay: 1000,
   },
   handler_travel: {
      delay: 1000,
   },
}

class SimpleMmo {
   constructor() {
      this.log = new Log(LVL.DEBUG)
      this.init_promise = this.init()
      this.handlers = {
         "handler_travel": { path: "travel", repeat: true },
         "handler_attack": { path: new RegExp("npcs\\/attack\\/.+"), repeat: true },
         "handler_gather": { path: new RegExp("crafting\\/material\\/gather\\/.+"), repeat: true },
         "handler_party": { path: "travel/party", repeat: true },
         "handler_party_join": { path: "travel/party/view", repeat: true },
         "handler_tasks": { path: new RegExp("tasks\\/.+"), repeat: false },
         "handler_user_attack": { path: new RegExp("user\\/attack\\/.+"), repeat: true },
      }
      this.is_captcha_clicked = false
      this.path = null
   }

   async init() {
      this.config = CONFIG
   }

   async onReload() {
   }

   async run() {
      let url = new URL(window.location.href)
      let path = url.pathname.substring(1)
      this.path = path
      let params = url.search

      let handler = null
      let cur_handler_config = null
      for (let [handler_name, handler_config] of Object.entries(this.handlers)) {
         cur_handler_config = handler_config
         let expr = handler_config.path
         let expr_type = common_util.get_type(expr)
         if (expr_type === common_util.types.String && expr === path) {
            handler = handler_name
            break
         } else if (expr_type === common_util.types.RegExp && expr.test(path)) {
            handler = handler_name
            break
         }
      }
      if (!handler) {
         this.log.log(`not founded ${path}`)
         return
      }
      this.log.log(`founded ${handler} for ${path}`)
      let config = structuredClone(this.config.default)
      if (this.config[handler])
         merge_obj(config, this.config[handler])

      if (!cur_handler_config.repeat) {
         await this[handler](params, config)
      } else {
         while (true) {
            await this[handler](params, config)
            await delay(config.delay)
         }
      }
   }

   async handler_travel(params, config) {
      if (this.check_captcha())
         return
      await click_util.try_click('a', 'Attack', this.log, config)
      await this.check_resources(config)
      await click_util.try_click('button', 'Take a step', this.log, config)
   }

   check_captcha() {
      let captcha = click_util.get_active_node_by_text('a', "a person! Promise!")
      if (captcha) {
         if (!this.is_captcha_clicked)
            captcha.click()
         this.is_captcha_clicked = true
         return true
      } else {
         this.is_captcha_clicked = false
         return false
      }
   }

   async check_resources(config) {
      if (click_util.get_active_node_by_text('span', 'Your skill level isn'))
         return
      await click_util.try_click('button', ['Salvage', 'Catch', 'Mine', 'Chop'], this.log, config)
   }

   async handler_attack(params, config) {
      await click_util.try_click('button', ['Attack', 'Leave'], this.log, config)
   }

   async handler_gather(params, config) {
      await click_util.try_click('button', ['Press here to gather', 'Press here to close'], this.log, config)
   }

   async handler_party(params, config) {
      await click_util.try_click('a',
         ['1 space free', '2 space free', '3 space free'],
         this.log, config)
   }

   async handler_party_join(params, config) {
      await click_util.try_click('a', 'Join', this.log, config)
      await click_util.try_click('button', 'Close', this.log, config)
   }

   async handler_tasks(params, config) {
      let type = this.path.split('/').at(-1)
      if (type === 'viewall')
         type = 'daily'

      let tasks = click_util.collect_tasks()
      let task_config = {
         quests: {},
         defeat: {},
      }
      for (let task of tasks) {
         let match
         if (match = task.text.match(/Successfully perform the quest  "(.+)" \d+ times./))
            task_config.quests[match[1]] = task.max - task.cur
         else if (match = task.text.match(/Defeat (.+) \d+ times./))
            task_config.defeat[match[1]] = task.max - task.cur
      }
      console.log(task_config)
   }

   async handler_user_attack(params, config) {
      await click_util.try_click('button', ['Attack', 'Close'], this.log, config)
   }

}

let simple_mmo = new SimpleMmo();
await simple_mmo.init_promise;
simple_mmo.run()

// Object.assign(
//    unsafeWindow,
//    {
//       mmo: simple_mmo,
//    }
// )