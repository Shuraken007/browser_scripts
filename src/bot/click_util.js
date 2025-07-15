import { jq } from '../util/jq.js';
import { is_visible } from '../util/window.js'
import { delay, toArr } from '../util/common.js'

export function get_active_node_by_text(type, text) {
   let nodes = jq(`${type}:contains("${text}")`)
      .filter(node => is_visible(node))
   if (nodes.length === 0)
      return null
   if (nodes.length > 1) {
      console.log(`Warning: founded ${buttons.length} '${type}' with text ${text}`)
   }
   return nodes[0]
}

export async function try_click(type, texts, log, config, is_click = true) {
   texts = toArr(texts)
   let node = null
   let cur_text = null
   for (let text of texts) {
      node = get_active_node_by_text(type, text)
      cur_text = text
      if (node)
         break
   }
   if (!node)
      return null
   if (type === 'button' && node.disabled)
      return null
   log.log(`click on ${type} with ${cur_text}`)
   if (is_click) {
      await delay(Math.random() * config.delta)
      node.click()
      await delay(200)
   }
   return true
}

export function collect_tasks() {
   let btns = jq('button:contains("Go to task")')
   let tasks = []
   for (let btn of btns) {
      let node = btn.parentNode.parentNode.parentNode.children[1]
      let progress = node.children[2].children[0].textContent
      let [cur, max] = progress.match(/\d+/g)
      let task = {
         text: node.children[0].textContent.trim(),
         cur: cur,
         max: max
      }
      tasks.push(task)
   }
   return tasks
}