import { toArr, isEmpty } from "./common.js"
import { get_node_parents } from "./dom.js"
const css_prefix = 'userscript_reader_mode_'
export function css_name(name) {
   return css_prefix + name
}

// as example www.royalroad.com/ added thousands of cssRules
// script leads to lags without caching
let rule_hash = {}

function get_css_rule(class_selector) {
   if (rule_hash[class_selector])
      return rule_hash[class_selector]
   for (let sheet of [...document.styleSheets].reverse()) {
      try { sheet.cssRules } catch (err) { continue }
      for (let sheetRule of [...sheet.cssRules].reverse()) {
         if (!sheetRule.selectorText) continue
         if (sheetRule.selectorText === class_selector) {
            rule_hash[class_selector] = sheetRule
            return sheetRule
         }
      }
   }
}

function get_element_selector(element) {
   let str = ''
   if (element.id)
      str += '#' + element.id
   if (element.classList) {
      for (let class_name of element.classList) {
         if (class_name.startsWith(css_prefix)) continue
         str += '.' + class_name
      }
   }
   if (isEmpty(str) && element.tagName)
      str += element.tagName
   return str
}

function get_element_highpriority_selector(element, class_name, generate_for_childs) {
   let selector = ''
   if (element.parentNode && element.parentNode !== document)
      selector += get_element_selector(element.parentNode) + '>'
   selector += get_element_selector(element)
   if (class_name)
      selector += '.' + class_name
   if (generate_for_childs) {
      selector += " *"
      selector += ', ' + selector + ':first-child'
   }
   return selector
}

function split_rule(css_text) {
   let selector = css_text.substr(0, css_text.indexOf('{'))
   let body = css_text.substr(css_text.indexOf('{'))
   return [selector, body]
}

let map_css_to_generated_css = {}
function add_generated_to_map(class_name, styleSheet) {
   if (!map_css_to_generated_css[class_name])
      map_css_to_generated_css[class_name] = []
   if (map_css_to_generated_css[class_name].includes(styleSheet))
      return
   map_css_to_generated_css[class_name].push(styleSheet)
}

function concat_rules_by_class_names(class_names) {
   let res = ""
   for (let class_name of class_names) {
      let rule = get_css_rule('.' + class_name)
      let [_, css_text] = split_rule(rule.cssText)
      if (res === "{ }") continue
      res += css_text
   }
   res = res.replaceAll("}{", ";")
   return res
}

async function generate_stylesheet_element_specific(element, class_names, generate_for_childs) {
   let class_name = class_names[class_names.length - 1]
   let element_classes_selector = get_element_highpriority_selector(element, class_name, generate_for_childs)
   let cache_key = 'last_selector_' + class_name
   if (element[cache_key] && element[cache_key] !== element_classes_selector)
      console.log({ old: element[cache_key], new: element_classes_selector })
   if (element[cache_key] && element[cache_key] === element_classes_selector)
      return
   else
      element.last_selector = element_classes_selector

   let css_text = concat_rules_by_class_names(class_names)
   cache_key = 'style_sheet_' + class_name
   let styleSheet = element[cache_key]
   if (!styleSheet) {
      styleSheet = document.createElement("style")
      document.head.appendChild(styleSheet)
      element[cache_key] = styleSheet
   }
   let new_css_text = element_classes_selector + css_text
   styleSheet.textContent = new_css_text
   styleSheet.setAttribute("id", element_classes_selector.replaceAll(/[#\.\->\* ]/g, '_'))
   add_generated_to_map(class_name, styleSheet)
}

function get_element_to_add_class(element, excluded = []) {
   // nearest wrapper for text node
   if (excluded.includes(element)) return null
   for (let elem of excluded)
      if (elem.contains(element)) return null
   if (!element.classList) {
      for (let parent of get_node_parents(element)) {
         if (!parent.classList) continue
         element = parent
         break
      }
   }
   return element
}

export function add_css_class(div, class_name) {
   if (!div.classList.contains(class_name))
      div.classList.add(class_name)
}

// all classes should be merged in order
export function generate_css_by_class(div, class_names, excluded = [], generate_for_childs = false) {
   class_names = toArr(class_names)
   class_names = class_names.map(short_name => css_name(short_name))

   let actual_class_name = class_names[class_names.length - 1]

   div = get_element_to_add_class(div, excluded)
   if (!div) return
   if (!div.classList.contains(actual_class_name))
      div.classList.add(actual_class_name)
   generate_stylesheet_element_specific(div, class_names, generate_for_childs)
}

export function set_class_width(class_name, max_width) {
   class_name = css_name(class_name)
   let rule = get_css_rule('.' + class_name);
   let inner_width = max_width
   for (const prop of ['padding-left', 'padding-right', 'border-left', 'border-right', 'margin-left', 'margin-right']) {
      if (!prop) continue
      let style_prop = rule.style.getPropertyValue(prop)
      let match = style_prop.match(/[\d]+/)
      if (!match) continue
      let val = Number(match[0])
      inner_width -= val
   }
   let props = {
      'max-width': max_width + 'px',
      'width': inner_width + 'px',
      'box-sizing': 'content-box',
   }
   set_css_class_property(class_name, props)
}

export function set_css_class_property(class_name, props, is_important = true) {
   let rule = get_css_rule('.' + class_name);
   if (!rule)
      return

   for (let [prop, val] of Object.entries(props)) {
      if (is_important)
         rule.style.setProperty(prop, val, 'important');
      else
         rule.style.setProperty(prop, val);
   }

   if (!map_css_to_generated_css[class_name]) return
   let [_, rule_cssText] = split_rule(rule.cssText)
   for (let styleSheet of map_css_to_generated_css[class_name]) {
      let [selector, sheet_cssText] = split_rule(styleSheet.textContent)
      styleSheet.textContent = selector + rule_cssText
   }
}

export function set_element_property(element, props) {
   for (let [k, v] of Object.entries(props)) {
      element.style[k.toString()] = v;
   }
}
