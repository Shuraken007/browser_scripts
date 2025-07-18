import { isImage } from '../util/common.js'
import * as w_util from '../util/window.js'
import { get_node_parents } from '../util/dom.js'
import { jq } from '../util/jq.js'
class ImageCalc {
   constructor() {
      this.image = null

      this.scale = null
      this.w = null
      this.h = null
      this.k = 0
      this.is_paralax = false
   }

   set(image) {
      this.image = image
      this.onResize()
   }

   get_image_scale() {
      let wh = w_util.wh()
      let ww = w_util.ww()
      let iw = this.image.naturalWidth
      let ih = this.image.naturalHeight

      let scale;
      if (ww / wh > iw / ih) {
         scale = ww / iw
      } else {
         scale = wh / ih
      }
      return scale
   }

   get_width() {
      return Math.ceil(this.image.naturalWidth * this.scale)
   }

   get_height() {
      return Math.ceil(this.image.naturalHeight * this.scale)
   }

   get_paralax_k() {
      if (this.h <= w_util.wh()) {
         this.is_paralax = false
         return
      }
      this.is_paralax = true

      let ph = w_util.ph()
      let wh = w_util.wh()
      if (ph === wh) {
         setTimeout(() => { this.get_paralax_k() }, 100)
         return 0
      }
      return (this.h - wh) / (ph - wh)
   }

   onResize() {
      if (!this.image)
         return
      this.scale = this.get_image_scale()
      this.w = this.get_width()
      this.h = this.get_height()
      if (this.h <= w_util.wh())
         this.is_paralax = false
      else {
         this.k = this.get_paralax_k()
         this.is_paralax = true
      }
   }
}

const image_div_name = 'userscript_reader_mode_image_div'
export class ImageSetter {
   constructor(config, page_analyser, css_class_setter) {
      this.image = null;

      this.config = config
      this.page_analyser = page_analyser
      this.css_class_setter = css_class_setter
      this.image_calc = new ImageCalc()
      this.image_div = this.create_image_div()
      this.onScrollCall = () => { this.onScroll() }
   }

   run() {
      window.addEventListener("scroll", this.onScrollCall);
      this.image_div.style.opacity = 'block'
   }

   stop() {
      window.removeEventListener("scroll", this.onScrollCall);
      this.image_div.style.opacity = 'none'
   }

   set(image) {
      if (!isImage(image)) {
         console.log('not an image')
         console.log(image)
         return
      }
      this.image_calc.set(image)
      if (this.image)
         this.image_div.removeChild(this.image)
      this.image_div.appendChild(image)
      this.image = image
      this.css_class_setter.AddClass(image, 'image', false)
      this.onResize()
      this.onScroll()
      this.remove_original_bg_images()
      // this.run_animation()
   }

   onReload(config) {
      this.config = config
   }

   onResize() {
      if (!this.image)
         return
      this.image_calc.onResize()
      this.css_class_setter.AddNodeStyle(
         this.image_div,
         {
            width: w_util.ww(),
            height: w_util.wh(),
         }
      )

      let height = "auto"
      let width = "auto"
      if (Math.abs(this.image_calc.h - w_util.wh()) < 5) {
         height = w_util.wh() + "px"
      } else {
         width = w_util.ww() + "px"
      }
      this.css_class_setter.AddNodeStyle(
         this.image,
         {
            width: width,
            height: height,
         }
      )

      let rect = w_util.get_absolute_bound_rect(this.image)
      let img_center = Math.ceil((rect.right + rect.left) / 2)
      let expected_center = Math.ceil(w_util.ww() / 2)
      let diff = expected_center - img_center
      if (diff !== 0) {
         this.image.style.left = rect.left + diff + "px"
         console.log({
            img_center: img_center,
            expected_center: expected_center,
         })
      }

      this.onScroll()
   }

   create_image_div() {
      let div = document.getElementById(image_div_name)
      if (!div) {
         div = document.createElement("div");
         div.setAttribute("id", image_div_name);
         document.body.prepend(div);
      }
      this.css_class_setter.AddClass(div, 'image_div', false)
      return div
   }

   onScroll() {
      if (!this.image) return
      if (!this.image_calc.is_paralax) {
         let top = w_util.get_absolute_bound_rect(this.image).top
         if (top !== 0)
            this.image.style.top = "0px";
         return
      }
      if (!this.image_div) return
      let offset = w_util.get_absolute_bound_rect(this.image_div).top
      let posY = Math.ceil(-1 * offset * this.image_calc.k)
      let img_diff = posY - this.image.offsetTop
      let max_diff = (25 / 1200) * w_util.wh()
      if (Math.abs(img_diff) > max_diff) {
         // prevent img jump, as example - on block with commants loaded / expanded
         posY = Math.ceil(this.image.offsetTop + Math.sign(img_diff) * max_diff)
      }
      this.image.style.top = `${posY}px`;
   }

   remove_original_bg_images() {
      if (this.config.image_div) {
         jq(this.config.image_div)[0].remove()
      }
      document.body.style.backgroundImage = 'none'
   }

   async run_animation() {
      let [divs,] = this.page_analyser.getDivs()
      if (divs.length === 0)
         return

      for (let div of divs) {
         let parents = get_node_parents(div)
         let last_parent = parents[parents.length - 1]
         last_parent.style.opacity = 0.7
         this.run_opacity_animation(last_parent, 1, 100, 10000)
         // divs[divs.length - 1].animate({ 'opacity': 1, "animation-direction": "reverse" }, 10000)
      }
   }

   run_opacity_animation(div, final_opacity, frames_n, time) {
      if (div.is_animation) return
      let opacity = Number(div.style.opacity)
      let diff = final_opacity - opacity;
      for (let i = 1; i <= frames_n; i++) {
         setTimeout(() => {
            div.is_animation = true
            div.style.opacity = Math.min(opacity + i * diff / frames_n, 0.999999)
            if (div.style.opacity === "0.999999")
               div.is_animation = false
         }, i * time / frames_n);
      }
   }

}