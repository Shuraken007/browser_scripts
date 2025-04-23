const exclude_node_tags = ['SCRIPT', 'STYLE', 'IFRAME']

export function get_text_nodes(node, is_visible = true, is_trimmed = false, all_nodes = []) {
   // not visible node
   if (is_visible && ![document, document.body].includes(node) && node.offsetParent === null)
      return all_nodes
   if (node.tagName && exclude_node_tags.includes(node.tagName)) {
      return all_nodes
   }

   switch (node.nodeType) {
      case Node.DOCUMENT_NODE:
      case Node.ELEMENT_NODE:
         if (node.tagName === "BR" && node.hasAttribute("data-immersive-translate-walked"))
            break;
         if (node.tagName === "BR")
            all_nodes.push(node)
         else
            node.childNodes.forEach((child) => get_text_nodes(child, is_visible, is_trimmed, all_nodes));
         break;
      case Node.TEXT_NODE: {
         if (!is_trimmed && !node.textContent.trim()) break;
         all_nodes.push(node)
         break;
      }
   }
   return all_nodes
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