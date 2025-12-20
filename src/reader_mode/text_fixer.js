import * as d_util from '../util/dom.js'

export class TextFixer {
   constructor(page_analyser) {
      this.page_analyser = page_analyser
   }

   run() {
      this.try_wrap_paragraphs()

      let paragraphs = this.page_analyser.getParagraphs()
      for (let paragraph of paragraphs) {
         this.remove_duplicate_br(paragraph)
      }
      this.join()
   }

   try_wrap_paragraphs() {
      let [divs,] = this.page_analyser.getDivs()
      let content_div = divs[0]
      if (!content_div) return

      let paragraph_content = []
      let child_nodes = [...content_div.childNodes]
      for (let node of child_nodes) {
         switch (node.nodeType) {
            case Node.ELEMENT_NODE:
               if (node.tagName !== "BR") break;
               if (d_util.is_immersive_translate_br(node)) {
                  paragraph_content = []
                  break
               }
               if (paragraph_content.length === 0) break;
               let new_paragraph = document.createElement("p");
               paragraph_content.forEach(n => {
                  content_div.removeChild(n)
                  new_paragraph.appendChild(n)
               })
               content_div.insertBefore(new_paragraph, node)
               content_div.removeChild(node)
               paragraph_content = []
               break;
            case Node.TEXT_NODE:
               if (!node.textContent.trim()) break;
               paragraph_content.push(node)
               break;
         }
      }
   }

   remove_duplicate_br(paragraph) {
      this.try_remove_sibling_br(paragraph)
      let nodes = new d_util.TextNodes({ root: paragraph, is_empty_allowed: true })
      let is_empty = false
      let is_text_started = false
      for (let node of nodes) {
         if (node.textContent.trim()) {
            is_empty = false
            is_text_started = true
            continue
         }
         if (is_text_started && !is_empty) {
            this.add_paragraph(paragraph, node)
         }
         if (!is_empty) {
            is_empty = true
            continue
         }
         node.parentNode.removeChild(node)
         is_empty = false
      }
      if (paragraph.hasAttribute("style")) {
         paragraph.removeAttribute("style")
      }
   }

   try_remove_sibling_br(paragraph) {
      let sibling = paragraph.nextSibling
      if (!(sibling && sibling.tagName)) return
      if (sibling.tagName !== "BR") return
      sibling.parentNode.removeChild(sibling)
   }

   add_paragraph(paragraph, cur_node) {
      let new_paragraph = document.createElement("p");
      let nodes = new d_util.TextNodes({ root: paragraph, is_empty_allowed: true })
      for (let node of nodes) {
         if (node === cur_node) {
            node.parentNode.removeChild(node)
            break
         }
         if (!node.parentNode)
            continue
         let child = d_util.get_node_parent_before(node, 'P') || d_util.get_node_parent_before(node, 'SPAN') || d_util.get_node_parent_before(node, 'DIV')
         child.parentNode.removeChild(child)
         new_paragraph.appendChild(child)
      }
      paragraph.parentNode.insertBefore(new_paragraph, paragraph)
   }

   join() {
      let torn_out_nodes = this.page_analyser.getTornOutNodes()
      for (let node of torn_out_nodes)
         this.join_sentence(node)
   }

   join_sentence(node) {
      let text_nodes = new d_util.TextNodes({ root: node })
      let concat_node = null
      let prev_br_node = null
      for (let text_node of text_nodes) {
         if (text_node.tagName === "BR") {
            concat_node = null
            if (prev_br_node)
               prev_br_node.parentNode.removeChild(prev_br_node)
            prev_br_node = text_node
            continue
         }
         prev_br_node = null
         if (!concat_node) {
            concat_node = text_node
            continue
         }
         let a = concat_node.textContent.at(-1)
         let b = text_node.textContent.at(0)
         if (a.toLowerCase() !== a.toUpperCase() && b.toLowerCase() !== b.toUpperCase())
            concat_node.textContent += ' ' + text_node.textContent
         else
            concat_node.textContent += text_node.textContent
         text_node.parentNode.removeChild(text_node)
      }
   }
}