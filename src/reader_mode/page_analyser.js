import { get_pct_diff } from "../util/common.js"
import { get_text_nodes, get_node_parents } from '../util/dom.js'
import { jq, get_elements_by_query_arr } from '../util/jq.js'
import { get_absolute_bound_rect } from '../util/window.js'

export class PageAnalyzer {
   constructor(config) {
      this.config = config
      this.url = window.location.href
      this.last_state = null
      this._refresh_state()
   }

   init(config) {
      let is_updated = false

      if (this.content_div_query !== config.content_div) {
         is_updated = true
         this.content_div_query = config.content_div
      }
      if (this.comment_div_query !== config.comment_div) {
         is_updated = true
         this.comment_div_query = config.comment_div
      }
      if (this.ignore_query !== config.ignore) {
         is_updated = true
         this.ignore_query = config.ignore
      }
      return is_updated
   }

   onReload(config) {
      if (this.init(config))
         this._refresh_state()
   }

   get_divs() {
      let divs = []
      for (let div of [this.get_content_div(), this.get_comment_div()]) {
         if (!div)
            break
         divs.push(div)
      }
      return divs
   }

   get_content_div() {
      let div = this._get_last_div('content_div')
      if (div)
         return div

      if (this.content_div_query) {
         div = jq(this.content_div_query);
         if (div.length > 0)
            return div.get(0)
      }

      let divs_with_text = this._get_divs_with_text()
      if (divs_with_text.length > 0) {
         div = divs_with_text[0][0]
      }
      if (div)
         this.last_state.content_div = { div: div, first_child: div.firstChild }

      return div
   }

   get_comment_div() {
      let div = this._get_last_div('comment_div')
      if (div)
         return div
      let content_div = this._get_last_div('content_div') || this.get_content_div()

      if (this.comment_div_query) {
         div = jq(this.comment_div_query);
         if (div.length > 0)
            return div.get(0)
      }

      let comments = document.querySelectorAll('div[class*="comment"]')
      for (let comment of comments) {
         if (!this._is_comment_div(content_div, comment)) continue
         div = comment
      }

      if (!div) return null

      for (let parent of get_node_parents(div)) {
         if (!this._is_comment_div(content_div, parent))
            break
         div = parent
      }

      if (div) {
         this.last_state.comment_div = { div: div, first_child: div.firstChild }
      }

      return div
   }

   _is_comment_div(content_div, comment_div) {
      let allowed_diff_pct = 2
      let content_rect = get_absolute_bound_rect(content_div)
      let div_rect = get_absolute_bound_rect(comment_div)
      if (div_rect.width <= content_rect.width * (1 + allowed_diff_pct / 100)
         && div_rect.top >= content_rect.bottom)
         return true
      return false
   }

   _get_divs_with_text() {
      let text_nodes = get_text_nodes(document.body)
      let ignore_divs = get_elements_by_query_arr(this.ignore_query)

      this.last_state.text_nodes_amount = text_nodes.length
      let divs = new Map();
      for (let node of text_nodes) {
         for (let parent of get_node_parents(node)) {
            if (parent.tagName !== 'DIV')
               continue
            if (ignore_divs.includes(parent))
               break
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

   _refresh_state() {
      this.last_state = {
         url: window.location.href,
         text_nodes_amount: 0,
         content_div: { div: null, firstChild: null },
         comment_div: { div: null, firstChild: null },
      }
   }

   _check_url() {
      if (this.last_state.url !== window.location.href)
         this._refresh_state()
   }

   _get_last_div(div_name) {
      this._check_url()
      let div = this.last_state[div_name].div
      if (!div) return null
      let text_nodes = get_text_nodes(document.body)
      if (text_nodes.length !== this.last_state.text_nodes_amount)
         return null
      if (this.last_state[div_name].first_child !== div.firstChild) {
         return null
      }
      return this.last_state[div_name].div
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
      let content_div = this.get_content_div()
      if (!content_div) return null
      while (node !== content_div && !["P", "DIV"].includes(node.tagName)) {
         if (get_text_nodes(node).length > 1) break
         node = node.parentNode
      }
      if (node === content_div)
         return null
      return node
   }

   get_torn_out_nodes() {
      let content_div = this.get_content_div()
      if (!content_div) return
      let text_nodes = get_text_nodes(content_div)
      let nodes = []
      for (let node of text_nodes) {
         if (!this.is_text_node_styled(node, content_div)) continue
         let parent = this.get_nearest_sentence_container(node)
         if (!parent) continue
         if (get_text_nodes(parent).length === 1) continue
         nodes.push([node, parent])
      }
      return nodes
   }

}