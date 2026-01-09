import { isEmpty } from "../util/common.js"
import { get_node_parents, is_node_in } from "../util/dom.js"
import { jqs } from "../util/jq.js"

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
            if (sheetRule.selectorText !== selector) continue
            this.searched_rules[selector] = sheetRule
            return sheetRule
         }
      }
   }

   split_rule(rule_as_str) {
      let selector = rule_as_str.substr(0, rule_as_str.indexOf('{'))
      let body = rule_as_str.substr(rule_as_str.indexOf('{'))
      return [selector, body]
   }

   get_rule_body_no_bracket(rule) {
      let str = rule.cssText
      return str.substring(str.indexOf('{') + 1, str.lastIndexOf('}'))
   }

   union_rules(class_names) {
      let bodies = []
      for (let class_name of class_names) {
         let rule = this.get_rule(class_name)
         bodies.push(this.get_rule_body_no_bracket(rule))
      }
      return "{" + bodies.join(";") + "}"
   }
}

export class CssClassSetter {
   constructor(ignore_nodes) {
      this.nodes_class_added = new Set()
      this.nodes_style_added = new Map()
      this.created_styles = {}
      this.rule_helper = new RuleHelper()
      this.ignore_nodes = ignore_nodes
      this.class_prefix = 'userscript_reader_mode_'
   }

   AddClass(node, class_name, is_save = true) {
      node = this.get_class_valid_node(node)
      let ignored = jqs(this.ignore_nodes)
      if (is_node_in(node, ignored)) return
      class_name = this.class_name(class_name)
      if (node.classList.contains(class_name))
         return
      node.classList.add(class_name)
      if (is_save)
         this.nodes_class_added.add(node)
   }

   AddOverridingClass(node, class_name, is_default = true, are_children = false) {
      node = this.get_class_valid_node(node)

      let ignored = jqs(this.ignore_nodes)
      if (is_node_in(node, ignored)) return

      this.AddClass(node, class_name)
      class_name = this.class_name(class_name)

      let node_selector = this.get_node_highpriority_selector(node, class_name, are_children)
      let style = this.get_style_by_node(node, node_selector)
      if (style.textContent.startsWith(node_selector)) return
      let rule_body
      if (is_default)
         rule_body = this.rule_helper.union_rules([this.class_name('default'), class_name])
      else {
         let rule = this.rule_helper.get_rule(class_name)
         rule_body = this.rule_helper.split_rule(rule.cssText)[1]
      }
      style.textContent = node_selector + rule_body
   }

   AddNodeStyle(node, props) {
      if (!this.nodes_style_added.has(node))
         this.nodes_style_added.set(node, {})

      let saved_changes = this.nodes_style_added.get(node)
      for (let [k, v] of Object.entries(props)) {
         let key = k.toString()
         if (!saved_changes.hasOwnProperty(key))
            saved_changes[key] = node.style[key];
         node.style[key] = v;
      }
   }

   AddRuleStyle(class_name, props, is_important = true) {
      class_name = this.class_name(class_name)
      let rule = this.rule_helper.get_rule(class_name)
      if (!rule) return
      let old_rule_body = this.rule_helper.get_rule_body_no_bracket(rule)
      for (let [prop, val] of Object.entries(props)) {
         let args = is_important ? [prop, val, 'important'] : [prop, val]
         rule.style.setProperty(...args)
      }

      if (!this.created_styles[class_name]) return
      let new_rule_body = this.rule_helper.get_rule_body_no_bracket(rule)

      for (let style of this.create_styles[class_name]) {
         style.textContent = style.textContent.replace(old_rule_body, new_rule_body)
      }
   }

   SetRuleWidth(class_name, max_width) {
      let rule = this.rule_helper.get_rule(this.class_name(class_name));
      let inner_width = max_width
      for (const prop of ['padding-left', 'padding-right', 'border-left', 'border-right', 'margin-left', 'margin-right']) {
         let style_prop = rule.style.getPropertyValue(prop)
         if (!style_prop) continue
         let val = parseInt(style_prop) || 0
         inner_width -= val
      }
      let props = {
         'max-width': max_width + 'px',
         'width': inner_width + 'px',
         'box-sizing': 'content-box',
      }
      this.AddRuleStyle(class_name, props)
   }

   ResetClasses() {
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
         selector = this.add_children(selector)
      return selector
   }

   add_children(selector) {
      let selectors = []
      for (let add of ["*", "*:first-child"])
         selectors.push(selector + ' ' + add)
      return selectors.join(', ')
   }

   get_style_by_node(node, node_selector) {
      if (!this.created_styles[node_selector])
         this.created_styles[node_selector] = new Map()
      let style_map = this.created_styles[node_selector]
      if (!style_map.has(node)) {
         let style = document.createElement("style")
         document.head.appendChild(style)
         style_map.set(node, style)
         style.setAttribute("id", node_selector.replaceAll(/[#\.\->\* ]/g, '_'))
      }
      return style_map.get(node)
   }
}