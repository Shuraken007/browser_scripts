const exclude_node_tags = ['SCRIPT', 'STYLE', 'IFRAME']

export function get_text_nodes(node, is_visible = true, all_nodes = []) {
   // not visible node
   if (is_visible && ![document, document.body].includes(node) && node.offsetParent === null)
      return all_nodes
   if (node.tagName && exclude_node_tags.includes(node.tagName))
      return all_nodes
   switch (node.nodeType) {
      case Node.DOCUMENT_NODE:
      case Node.ELEMENT_NODE:
         node.childNodes.forEach((child) => get_text_nodes(child, is_visible, all_nodes));
         break;
      case Node.TEXT_NODE: {
         if (!node.textContent.trim()) break;
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