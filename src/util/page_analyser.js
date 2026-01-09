import { TextNodes, get_node_parents, get_node_parent, is_node_in } from '../util/dom.js'
import { jq, jqs } from '../util/jq.js'
import { get_absolute_bound_rect } from '../util/window.js'

class DivStorage {
   constructor() {
      this.div = null
      this.div_old = null
      this.is_updated = true
   }

   get() {
      return this.div
   }

   set(div) {
      if (div === this.div) return
      this.div_old = this.div
      this.div = div
      if (this.div_old) {
         this.is_updated = true
      }
   }

   reset_update() {
      this.is_updated = false
   }
}

export class PageAnalyzer {
   constructor(config) {
      this.config = config

      this.reset_on_update = false
      this.url = window.location.href
      this.text_nodes_amount = 0

      this.known_keys = ['content', 'comment']
      this.divs = {}
      for (let key of this.known_keys)
         this.divs[key] = new DivStorage()
   }

   onReload(config) {
      this.config = config
      this.reset_on_update = true
   }

   getDivs() {
      this.update_divs()
      let is_updated = false
      let divs = []
      for (let key of this.known_keys) {
         let div = this.divs[key].get()
         if (div)
            divs.push(div)
         is_updated ||= this.divs[key].is_updated
      }
      return [divs, is_updated]
   }

   resetUpdate() {
      for (let key of this.known_keys)
         this.divs[key].reset_update()
   }

   getTornOutNodes() {
      let content_div = this.divs['content'].get()
      if (!content_div) return
      let text_nodes = new TextNodes({ root: content_div })
      let nodes = new Set()
      for (let node of text_nodes) {
         if (!this.is_text_node_styled(node, content_div)) continue
         let parent = this.get_nearest_sentence_container(node)
         if (!parent) continue
         let parent_text_nodes = new TextNodes({ root: parent })
         if (parent_text_nodes.get_length() === 1) continue
         nodes.add(parent)
      }
      return [...nodes]
   }

   getParagraphs() {
      let content_div = this.divs['content'].get()
      if (!content_div) return

      let text_nodes = new TextNodes({ root: content_div })
      let paragraphs = new Set()
      for (let node of text_nodes) {
         let paragraph = get_node_parent(node, 'P') || get_node_parent(node, 'SPAN') || get_node_parent(node, 'DIV')
         if (paragraph === content_div) continue
         if (paragraph) {
            paragraphs.add(paragraph)
         }
      }
      return [...paragraphs]
   }

   update_divs() {
      let text_nodes = new TextNodes({ root: document.body })
      let is_reset = this.is_reset(text_nodes)
      this.text_nodes_amount = text_nodes.length
      this.reset_on_update = false
      this.url = window.location.href

      for (let key of this.known_keys) {
         if (!is_reset && this.divs[key].get())
            continue
         let query = this.config[`${key}_div`]
         if (query) {
            let div = jq(query)[0]
            if (div.length > 0) {
               this.divs[key].set(div.get(0))
               continue
            }
         }
         let div = this[key](text_nodes)
         this.divs[key].set(div)
      }
   }

   is_new_url() {
      if (this.url !== window.location.href)
         return true
      return false
   }

   is_reset(text_nodes) {
      if (this.reset_on_update)
         return true
      if (this.is_new_url())
         return true
      if (text_nodes.length !== this.text_nodes_amount)
         return true
      return false
   }

   content(text_nodes) {
      let divs_with_text = this.get_divs_with_text(text_nodes)
      if (divs_with_text.length === 0)
         return null
      return divs_with_text[0][0]
   }

   comment() {
      let content_div = this.divs['content'].get()

      let comments = document.querySelectorAll('div[class*="comment"]')
      let div
      for (let comment of comments) {
         if (!this.is_comment_div(content_div, comment)) continue
         div = comment
      }

      if (!div) return null

      for (let parent of get_node_parents(div)) {
         if (!this.is_comment_div(content_div, parent))
            break
         div = parent
      }

      return div
   }

   is_comment_div(content_div, comment_div) {
      let allowed_diff_pct = 2
      let content_rect = get_absolute_bound_rect(content_div)
      let div_rect = get_absolute_bound_rect(comment_div)
      if (div_rect.width <= content_rect.width * (1 + allowed_diff_pct / 100)
         && div_rect.top >= content_rect.bottom)
         return true
      return false
   }

   get_divs_with_text(text_nodes) {
      let ignore_divs = jqs(this.config.ignore)

      let divs = new Map();
      for (let node of text_nodes) {
         if (is_node_in(node, ignore_divs)) continue
         for (let parent of get_node_parents(node)) {
            if (parent.tagName !== 'DIV')
               continue
            if (is_node_in(parent, ignore_divs)) continue
            let other_nodes_contained = false
            for (let child of text_nodes) {
               if (child === node) continue
               if (parent.contains(child)) {
                  other_nodes_contained = true
                  break
               }
            }
            if (!other_nodes_contained)
               continue
            divs.set(parent, (divs.get(parent) ?? 0) + 1)
            break
         }
      }
      let sorted_divs = [...divs].sort(([, a], [, b]) => b - a)
      return sorted_divs
   }

   is_text_node_styled(node, content_div, styles = ["EM", "I"]) {
      if (node.tagName === "P") return false
      while (node !== content_div && !["P", "DIV"].includes(node.tagName)) {
         if (styles.includes(node.tagName)) return true
         node = node.parentNode
      }
      return false
   }

   get_nearest_sentence_container(node) {
      let content_div = this.divs['content'].get()
      if (!content_div) return null
      while (node !== content_div && !["P", "DIV"].includes(node.tagName)) {
         node = node.parentNode
      }
      if (node === content_div)
         return null
      let text_nodes = new TextNodes({ root: node })
      if (text_nodes.get_length() <= 1)
         return null
      return node
   }

}