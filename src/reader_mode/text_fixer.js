import * as d_util from '../util/dom.js'

export class TextFixer {
   constructor(page_analyser) {
      this.page_analyser = page_analyser
   }

   run() {
      let paragraphs = this.page_analyser.getParagraphs()
      for (let paragraph of paragraphs) {
         // if (paragraph.hasAttribute("data-immersive-translate-walked"))
         //    continue
         this.remove_duplicate_br(paragraph)
         this.add_extra_para
      }
      this.join()
   }

   remove_duplicate_br(paragraph) {
      let nodes = d_util.get_text_nodes(paragraph, true, true)
      let is_empty = false
      let is_text_started = false
      for (let node of nodes) {
         if (node.textContent.trim()) {
            is_empty = false
            is_text_started = true
            continue
         }
         if (is_text_started && !is_empty)
            this.add_paragraph(paragraph, node)
         if (!is_empty) {
            is_empty = true
            continue
         }
         node.parentNode.removeChild(node)
         is_empty = false
      }
   }

   add_paragraph(paragraph, cur_node) {
      let new_paragraph = document.createElement("p");
      let nodes = d_util.get_text_nodes(paragraph, true, true)
      for (let node of nodes) {
         if (node === cur_node) {
            node.parentNode.removeChild(node)
            break
         }
         if (!node.parentNode)
            continue
         let child = d_util.get_node_parent_before(node, 'P')
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
      let text_nodes = d_util.get_text_nodes(node, false)
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