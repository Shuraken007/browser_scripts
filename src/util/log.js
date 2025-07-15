import { get_key_by_val, get_type, types } from "./common.js"

export const LVL = {
   DEBUG: 0,
   INFO: 1,
   WARNING: 2,
   ERROR: 3,
}

const LVL_COLORS = {
   DEBUG: "color: #808080",
   INFO: "color: #5f875f",
   WARNING: "color: #d75f00",
   ERROR: "color: #800000",
}

export class Log {
   constructor(level) {
      this.level = level
   }

   log(msg, level = LVL.DEBUG, is_time = true) {
      if (this.level > level)
         return

      let lvl_name = get_key_by_val(LVL, level)
      let time = ''
      if (is_time) {
         const d = new Date();
         time = ' [' + d.toLocaleTimeString() + `.${d.getMilliseconds()}` + ']'
      }
      if (get_type(msg) === types.String)
         console.log(`%c${lvl_name}`, LVL_COLORS[lvl_name], `${time}: ${msg}`)
      else {
         console.log(`%c${lvl_name}`, LVL_COLORS[lvl_name], `${time}:`)
         console.log(msg)
      }
   }
}