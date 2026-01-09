import { delay } from '../util/common.js'
import { generate_buttons, generate_buttons_div } from '../wallpaper/svg.js'
import './style.css';
export class UiController {
   constructor(page_analyser, image_loader) {
      this.page_analyser = page_analyser
      this.image_loader = image_loader

      this.divs = []
      this.buttons_top = {}
      this.buttons_bottom = {}

      this.is_rendered = false
   }

   async render() {
      let config = {
         prev: () => this.image_loader.prev(),
         like: (is_other_state) => this.like(is_other_state),
         dislike: (is_other_state) => this.dislike(is_other_state),
         eye: (is_other_state) => this.eye(is_other_state),
         next: () => this.image_loader.next(),
      }
      let order = ['prev', 'like', 'dislike', 'eye', 'next']
      let buttons_top = generate_buttons(config)
      let div_top = generate_buttons_div(buttons_top, order)
      let buttons_bottom = generate_buttons(config)
      let div_bottom = generate_buttons_div(buttons_bottom, order)

      buttons_top.dislike.change_state(false)

      let content_div = null
      while (!(content_div)) {
         let [divs,] = this.page_analyser.getDivs()
         content_div = divs[0]
         await delay(200)
      }
      content_div.insertBefore(div_top, content_div.firstElementChild)
      content_div.appendChild(div_bottom)

      this.buttons_top = buttons_top
      this.buttons_bottom = buttons_bottom
      this.divs = [div_top, div_bottom]

      this.is_rendered = true
   }

   async onReload() {
      for (let button of Object.values(this.buttons_top))
         button.parentNode.remove(button)
      this.buttons_top = {}
      for (let button of Object.values(this.buttons_bottom))
         button.parentNode.remove(button)
      this.buttons_bottom = {}
      for (let div of this.divs) {
         div.parentNode.remove(div)
      }
      this.divs = []
      await this.render()
   }

   async onImageSet(image_spec) {

      while (!this.is_rendered) {
         await delay(200)
      }

      let is_liked = image_spec.loader.is_liked(image_spec)
      let is_disliked = image_spec.loader.is_disliked(image_spec)

      this.buttons_top.like.change_state(is_liked)
      this.buttons_bottom.like.change_state(is_liked)

      this.buttons_top.dislike.change_state(is_disliked)
      this.buttons_bottom.dislike.change_state(is_disliked)
   }

   async like(is_other_state) {
      let image_spec = this.image_loader.get_current_image_spec()

      let is_success = await image_spec.loader.like(image_spec, is_other_state)

      if (!is_success) return

      this.buttons_top.like.change_state(!is_other_state)
      this.buttons_bottom.like.change_state(!is_other_state)
   }

   async dislike(is_other_state) {
      let image_spec = this.image_loader.get_current_image_spec()

      let is_success = await image_spec.loader.dislike(image_spec, is_other_state)

      if (!is_success) return

      this.buttons_top.dislike.change_state(!is_other_state)
      this.buttons_bottom.dislike.change_state(!is_other_state)
      if (!is_other_state)
         this.image_loader.next()
   }

   async eye(is_other_state) {
      this.buttons_top.eye.change_state(!is_other_state)
      this.buttons_bottom.eye.change_state(!is_other_state)

      let [divs,] = this.page_analyser.getDivs()
      let content_div = divs[0]

      if (!is_other_state) {
         content_div.style.visibility = 'hidden'
      } else {
         content_div.style.visibility = 'visible'
      }
   }
}