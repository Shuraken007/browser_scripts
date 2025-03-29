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