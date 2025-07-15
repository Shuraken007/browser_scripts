// window width
export function ww() {
   return document.body.clientWidth
}
// window height
export function wh() {
   return window.innerHeight
}
// page height
export function ph() {
   let r = document.body.getBoundingClientRect()
   let body_shift = r.top + window.scrollY
   return document.body.clientHeight + body_shift
}

export function get_absolute_bound_rect(element) {
   const r = element.getBoundingClientRect();
   return {
      left: r.left + window.scrollX,
      right: r.right + window.scrollX,
      top: r.top + window.scrollY,
      bottom: r.bottom + window.scrollY,
      width: r.width
   };
}

const scroll_delta = 2
export function is_scroll_to_bottom() {
   let max_scroll = ph() - wh()
   let diff = max_scroll - window.scrollY
   if (diff < scroll_delta)
      return true
   return false
}

function is_node_in_viewport(node) {
   const rect = node.getBoundingClientRect();
   return (
      rect.top >= 0 &&
      rect.left >= 0 &&
      rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
      rect.right <= (window.innerWidth || document.documentElement.clientWidth)
   );
}

function is_node_visible(node) {
   if (!node.checkVisibility())
      return false

   let style = window.getComputedStyle(node)
   if (style.display === 'none')
      return false
   if (style.opacity === '0')
      return false
   if (style.visibility === 'hidden')
      return false
   // if (style['content-visibility'] === 'hidden')
   //    return false
   // if (!is_node_in_viewport(node))
   //    return false

   return true
}

export function is_visible(node) {
   // window.getComputedStyle(el).opacity !== '0' && window.getComputedStyle(el.offsetParent).opacity !== '0'
   return is_node_visible(node) && is_node_visible(node.offsetParent)
}