const exclude_node_tags = ['SCRIPT', 'STYLE', 'IFRAME']

export class TextNodes {
   constructor({ root, is_visible = true, is_empty_allowed = false, exclude_node_tags = ['SCRIPT', 'STYLE', 'IFRAME'] }) {
      this.root = root
      this.exclude_node_tags = exclude_node_tags
      this.is_visible = is_visible
      this.is_empty_allowed = is_empty_allowed
   }

   is_valid(node) {
      if (!node)
         return false
      // not visible node
      if (this.is_visible && ![document, document.body].includes(node) && node.offsetParent === null)
         return false
      if (node.tagName && this.exclude_node_tags.includes(node.tagName)) {
         return false
      }

      return true
   }

   is_node_skipped(node) {
      if (this.is_empty_allowed)
         return false
      if (!node.textContent.trim())
         return true
      return false
   }

   is_immersive_translate_br(node) {
      if (node.tagName !== "BR")
         return false
      if (node.hasAttribute("data-immersive-translate-walked"))
         return true
      if (node.parentNode && node.parentNode.hasAttribute("data-immersive-translate-translation-element-mark"))
         return true
      return false
   }

   *next(node = this.root) {
      if (!this.is_valid(node)) return
      let type = node.nodeType
      if (type === Node.ELEMENT_NODE && node.tagName === "BR") {
         // don't touch external plugin
         if (this.is_immersive_translate_br(node)) return
         yield node
      } else if (type === Node.ELEMENT_NODE && node.tagName !== "BR") {
         for (let child of node.childNodes) {
            yield* this.next(child)
         }
      } else if (type === Node.TEXT_NODE) {
         if (this.is_node_skipped(node)) return;
         yield node
      }
   }

   *[Symbol.iterator]() {
      yield* this.next()
   }

   filter(call) {
      let query = this[Symbol.iterator]().filter(call)
      return [...query]
   }

   get_length() {
      let query = this[Symbol.iterator]()
      let length = 0
      for (let _ of query) {
         length += 1
      }
      return length
   }
}

export function get_node_parents(node, parents = []) {
   let parent = node.parentNode
   if (!parent || [document, document.body].includes(parent))
      return parents
   parents.push(parent)
   return get_node_parents(parent, parents)
}

export function get_node_parent(node, tagName) {
   let parent = node.parentNode
   if (!parent || [document, document.body].includes(parent))
      return null
   if (parent.tagName === tagName)
      return parent
   return get_node_parent(parent, tagName)
}

export function get_node_parent_before(node, tagName) {
   let parent = node.parentNode
   if (!parent || [document, document.body].includes(parent))
      return null
   if (parent.tagName === tagName)
      return node
   return get_node_parent_before(parent, tagName)
}

export function get_node_siblings(node, node_type = null) {
   let siblings = []
   if (!node.parentNode)
      return siblings
   for (let sibling of node.parentNode.children) {
      if (sibling === node) continue
      if (node.offsetParent !== null && sibling.offsetParent === null) continue
      if (node_type != null && sibling.tagName !== node_type) continue
      siblings.push(sibling)
   }
   return siblings
}

export function is_node_in(node, node_arr) {
   if (node_arr.includes(node)) return true
   for (let node_e of node_arr)
      if (node_e.contains(node)) return true
   return false
}