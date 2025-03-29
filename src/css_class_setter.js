import { isEmpty, toArr } from "util/common.js"
import { get_node_parents } from "util/dom.js"
import { get_elements_by_query_arr } from "util/jq.js"

class RuleHelper {
   constructor() {
      this.searched_rules = {}
   }

   get_rule(class_name) {
      let selector = '.' + class_name
      if (this.searched_rules[selector])
         return this.searched_rules[selector]
      // reverse used because injected style.css added to the end of list
      for (let sheet of [...document.styleSheets].reverse()) {
         try { sheet.cssRules } catch (err) { continue }
         for (let sheetRule of [...sheet.cssRules].reverse()) {
            if (!sheetRule.selectorText) continue
            if (sheetRule.selectorText === selector) {
               this.searched_rules[selector] = sheetRule
               return sheetRule
            }
         }
      }
   }

   split_rule(css_text) {
      let selector = css_text.substr(0, css_text.indexOf('{'))
      let body = css_text.substr(css_text.indexOf('{'))
      return [selector, body]
   }

   union_rules(class_names) {
      let res = ""
      for (let class_name of class_names) {
         let rule = this.get_rule(class_name)
         let [_, css_text] = this.split_rule(rule.cssText)
         if (res === "{ }") continue
         res += css_text
      }
      res = res.replaceAll("}{", ";")
      return res
   }
}

class CssClassSetter {
   constructor(ignore_nodes) {
      this.nodes_class_added = new Set()
      this.nodes_style_added = new Map()
      this.created_styles = {}
      this.rule_helper = new RuleHelper()
      this.ignore_nodes = ignore_nodes
      this.class_prefix = 'userscript_reader_mode_'
   }

   add_class(node, class_name) {
      node = this.get_class_valid_node(node)
      if (this.is_ignored(node)) return
      class_name = this.class_name(class_name)

      if (div.classList.contains(class_name))
         return
      div.classList.add(class_name)
      this.nodes_class_added.add(node)
   }

   create_node_rule(node, class_names, are_children) {
      node = this.get_class_valid_node(node)
      if (this.is_ignored(node)) return
      class_names = toArr(class_names)
      class_names = class_names.map(e => this.class_name(e))
      let class_name = class_names[class_names.length - 1]

      this.add_class(node, class_name)

      let node_selector = this.get_node_highpriority_selector(node, class_name, are_children)
      let style = this.get_style_by_node(node, node_selector)
      if (style.textContent.startsWith(node_selector)) return
      let css_text = this.rule_helper.union_rules(class_names)
      style.textContent = node_selector + css_text
   }

   set_node_style_properties(node, props) {
      if (!this.nodes_style_added.has(node))
         this.nodes_style_added.set(node, {})

      let saved_changes = this.nodes_style_added.get(node)
      for (let [k, v] of Object.entries(props)) {
         element.style[k.toString()] = v;
         saved_changes[k.toString()] = v;
      }
   }

   set_css_class_property(class_name, props, is_important = true) {
      class_name = this.class_name(class_name)
      let rule = this.rule_helper.get_rule(class_name)
      if (!rule) return

      for (let [prop, val] of Object.entries(props)) {
         let args = is_important ? [prop, val, 'important'] : [prop, val]
         rule.style.setProperty(...args)
      }

      if (!this.created_styles[class_name]) return
      let [_, css_text] = this.rule_helper.split_rule(rule.cssText)
      for (let style of this.create_styles[class_name]) {
         let [selector, _] = split_rule(style.textContent)
         style.textContent = selector + css_text
      }
   }

   set_class_width(class_name, max_width) {
      class_name = this.class_name(class_name)
      let rule = this.rule_helper.get_rule(class_name);
      let inner_width = max_width
      for (const prop of ['padding-left', 'padding-right', 'border-left', 'border-right', 'margin-left', 'margin-right']) {
         let style_prop = rule.style.getPropertyValue(prop)
         if (!style_prop) continue
         let val = parseInt(prop) || 0
         inner_width -= val
      }
      let props = {
         'max-width': max_width + 'px',
         'width': inner_width + 'px',
         'box-sizing': 'content-box',
      }
      this.set_css_class_property(class_name, props)
   }

   reset_classes() {
      for (let node of this.nodes_class_added) {
         let to_remove = []
         for (let class_name of [...node.classList]) {
            if (!class_name.startsWith(this.class_prefix)) continue
            to_remove.push(class_name)
         }
         node.classList.remove(...to_remove)
      }
   }

   get_class_valid_node(node) {
      if (node.classList)
         return node
      for (let parent of get_node_parents(node)) {
         if (!parent.classList) continue
         node = parent
         break
      }
      return node
   }

   class_name(name) {
      return this.class_prefix + name
   }

   is_ignored(node) {
      let i_nodes = get_elements_by_query_arr(this.ignore_nodes)
      if (i_nodes.includes(node)) return false
      for (let i_node of i_nodes)
         if (i_node.contains(node)) return false
      return true
   }

   get_classes_selector(node) {
      if (!node.classList) return ""
      let selector = ""
      for (let class_name of node.classList) {
         if (class_name.startsWith(this.class_prefix)) continue
         selector += '.' + class_name
      }
      return selector
   }

   get_node_selector(node) {
      let selector = ""
      if (node.id)
         selector += '#' + node.id
      selector += this.get_classes_selector(node)
      if (isEmpty(selector) && node.tagName)
         selector += node.tagName
      return selector
   }

   get_node_highpriority_selector(node, class_name, are_children) {
      let selector = ""
      if (node.parentNode && node.parentNode !== document)
         selector += this.get_node_selector(node.parentNode) + '>'
      selector += this.get_node_selector(node)
      if (class_name)
         selector += '.' + class_name
      if (are_children)
         selector = this.add_children(children)
      return selector
   }

   add_children(selector) {
      let selectors = []
      for (let add of ["*", "*:first-child"])
         selectors.push(selector + ' ' + add)
      return selectors.join(', ')
   }

   get_style_by_node(node, node_selector) {
      let style_map = this.created_styles[class_name]
      if (!style_map)
         this.created_styles[class_name] = new Map()
      if (!this.created_styles.has(node)) {
         let style = document.createElement("style")
         document.head.appendChild(style)
         style_map.add(node, style)
         style.setAttribute("id", node_selector.replaceAll(/[#\.\->\* ]/g, '_'))
      }
      return style_map.get(node)
   }
}