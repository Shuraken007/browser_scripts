async function delay(ms) {
   return new Promise(resolve => setTimeout(resolve, ms))
}

class TextNodes {
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

async function main() {
   let root = document.body
   if (!root) return

   let text_nodes = new TextNodes({ root: document.body })
   // let brs = text_nodes.filter(node => node.tagName === "BR")
   // let brs = [...text_nodes[Symbol.iterator]().filter(node => node.tagName === "BR")]
   // console.log(text_nodes.get_length())
   // for (let node of text_nodes[Symbol.iterator]().filter(node => node.tagName === "BR")) {
   //    console.log(node.textContent)
   // }
}

main()