import './style.css';
import * as util from '../util/common.js'
import { jq } from '../util/jq.js'
import * as w_util from '../util/window.js'
import * as d_util from '../util/dom.js'
import { ScriptRunner, mutation_modes } from "../script_runner.js";
import { CacheUrlLoader } from "../cache_url_loader.js"
import { SyncSession } from "./sync_session.js"
import { ImageLoader } from "./image_loader.js"
import { PageAnalyzer } from './page_analyser.js'
import { ImageSetter } from './image_setter.js'
import { CssClassSetter } from './css_class_setter.js'
import { TextFixer } from './text_fixer.js'

let script_runner;

class Reader {
   constructor() {
      this.cache_url_loader = new CacheUrlLoader(() => { this.onReload() })

      this.sync_session = new SyncSession()
      this.page_analyser = null
      this.image_loader = null
      this.image_setter = null
      this.css_class_setter = null
      this.text_fixer = null

      this.loaded_config = null
      this.config_by_url = null
      this.config = null

      this.any_url_matched = false
      this.on = false

      this.init_promise = this.init()
      this.onResizeCall = () => { this.onResize() }
      this.onScrollCall = () => { this.onScroll() }
   }

   async init() {
      await this.load_config()
      this.config_by_url = this.build_config_by_url()
   }

   async load_config() {
      let config = await this.cache_url_loader.load(CONFIG_URL)
      if (config.reader_mode !== null)
         config = config.reader_mode
      this.loaded_config = config
   }

   build_config_by_url() {
      // prepare config - take only sections with passed url, merge them
      let config = structuredClone(this.loaded_config.common)
      this.any_url_matched = false
      let suited_keys = []
      for (let [k, v] of Object.entries(this.loaded_config)) {
         if (k === 'common') continue
         let url_regex = util.urlToRegex(v.url);
         if (!url_regex.test(window.location.href))
            continue;
         this.any_url_matched = true
         suited_keys.push(k)
         if (!v.hasOwnProperty('is_reader'))
            v.is_reader = true
         if (!v.hasOwnProperty('is_wallpaper'))
            v.is_wallpaper = true
      }
      suited_keys.sort((a, b) => {
         let l_a = this.loaded_config[a].url.length
         let l_b = this.loaded_config[b].url.length
         return l_a - l_b
      })
      for (let key of suited_keys) {
         util.merge_obj(config, this.loaded_config[key])
      }
      return config
   }

   // merge with override_by_nearest_width section and select div_width
   build_config_by_width(config) {
      if (!config.override_by_nearest_width)
         return config

      let config_by_width = structuredClone(config)
      let window_width = w_util.ww()
      let selected_w
      for (let w of Object.keys(config.override_by_nearest_width)) {
         w = Number(w)
         if (window_width < w)
            continue
         if (selected_w < w)
            selected_w = w
         if (!selected_w)
            selected_w = w
      }
      if (selected_w)
         util.merge_obj(config_by_width, config.override_by_nearest_width[selected_w])
      this.update_div_width(selected_w, config_by_width)
      return config_by_width
   }

   update_div_width(selected_w, config) {
      let window_width = w_util.ww()
      let window_k = (config.div_max_width_pct || 100) / 100
      let max_window_width = Math.ceil(window_width * window_k)

      if (!selected_w)
         selected_w = window_width
      config.div_width = Math.min(selected_w, max_window_width)
   }

   run() {
      if (!this.image_loader.is_on() && this.config.is_wallpaper !== false)
         this.image_loader.run()
      if (this.on)
         return
      this.on = true
      // this.sync_session.run()
      this.image_setter.run()
      window.addEventListener("resize", this.onResizeCall);
      if (this.config.next)
         window.addEventListener("scroll", this.onScrollCall);
   }

   stop() {
      if (!this.on)
         return
      this.on = false
      this.sync_session.stop()
      this.image_loader.stop()
      this.image_setter.stop()
      this.css_class_setter.ResetClasses()
      window.removeEventListener("resize", this.onResizeCall);
      window.removeEventListener("scroll", this.onScrollCall);
   }

   async onLoad() {
      this.config = this.build_config_by_width(this.config_by_url)
      this.css_class_setter = new CssClassSetter(this.config.ignore)
      this.page_analyser = new PageAnalyzer(this.config)
      this.text_fixer = new TextFixer(this.page_analyser)
      this.image_setter = new ImageSetter(this.config, this.page_analyser, this.css_class_setter)
      this.image_loader = new ImageLoader({
         config: this.config.wallpapers,
         onUpdate: (image) => { this.set_image(image) },
         session: this.sync_session
      })

      if (!this.any_url_matched)
         return this.stop()

      this.run()
      this.update_css()
      await this.onMutation()
   }

   async onResize() {
      await util.delay(200) // prevent bugs
      let new_config = this.build_config_by_width(this.config_by_url)
      if (!util.are_obj_equal(this.config, new_config)) {
         this.config = new_config
         this.image_loader.onReload(this.config.wallpapers)
         this.page_analyser.onReload(this.config)
         this.image_setter.onReload(this.config)
      }
      this.update_css()
      this.image_setter.onResize()
      this.onMutation()
   }

   onPageAnalyzerDivsChanged() {
      this.css_class_setter.ResetClasses()
      this.update_css()
   }

   async onReload() {
      // await this.init()
      // await this.onLoad()
      // this.image_loader.onReload({ config: this.config.wallpapers })
   }

   async onUrlUpdate() {
      this.config_by_url = this.build_config_by_url()
      if (this.any_url_matched) {
         this.run()
         this.onResize()
      } else {
         this.stop()
      }
   }

   onError(err) {
      console.log(err)
      this.image_loader.onError()
      this.cache_url_loader.onError()
   }

   async onMutation() {
      if (!this.any_url_matched) return
      this.prepareNewPage()
   }

   update_css() {
      const known_name = ['default', 'content', 'comment', 'parents', 'siblings', 'body', 'text',]
      for (const name of known_name) {
         let config_props = this.config['css_' + name]
         if (!config_props) continue
         this.css_class_setter.AddRuleStyle(name, config_props)
      }

      for (const class_name of ['content', 'comment', 'parents', 'siblings'])
         this.css_class_setter.SetRuleWidth(class_name, this.config.div_width)
   }

   prepareNewPage() {
      let conf = this.config
      if (conf.requires && jq(conf.requires).length === 0) {
         return
      }
      let [divs, is_update] = this.page_analyser.getDivs()
      if (is_update) {
         this.onPageAnalyzerDivsChanged()
         this.page_analyser.resetUpdate()
      }
      if (divs.length === 0)
         return

      this.add_div_css(divs);
      this.add_body_css()
      this.text_fixer.run()
   }

   async add_div_css(divs) {
      let w = this.config.div_width
      let already_marked = [...divs]
      for (let i = 0; i < divs.length; i++) {
         let style_name = i == 0 ? 'content' : 'comment'
         let div = divs[i]
         this.css_class_setter.AddOverridingClass(div, style_name)
         for (let sibling of d_util.get_node_siblings(div)) {
            if (already_marked.includes(sibling)) continue
            this.css_class_setter.AddOverridingClass(sibling, 'siblings')
            already_marked.push(sibling)
         }
         for (let parent of d_util.get_node_parents(div)) {
            if (already_marked.includes(parent)) continue
            if (!(parent.offsetWidth && parent.offsetWidth > w)) {
               this.css_class_setter.AddOverridingClass(parent, 'parents')
            } else
               this.css_class_setter.AddOverridingClass(parent, 'default', false)
            already_marked.push(parent)
            for (let sibling of d_util.get_node_siblings(parent)) {
               if (already_marked.includes(sibling)) continue
               this.css_class_setter.AddOverridingClass(sibling, 'siblings')
               already_marked.push(sibling)
            }
         }
      }
      this.css_class_setter.AddOverridingClass(divs[0], 'text', false, true)
   }

   add_body_css() {
      this.css_class_setter.AddOverridingClass(document.body, 'body', false)
   }

   async set_image(image) {
      await this.image_setter.set(image)
   }

   onScroll() {
      if (!w_util.is_scroll_to_bottom()) return
      if (!this.config.next) return
      let next_buttons = util.toArr(this.config.next)
      for (let query of next_buttons) {
         let x = jq(query)[0]
         if (x) x.click();
      }
   }
}

let reader = new Reader();
await reader.init_promise;
script_runner = new ScriptRunner(
   {
      name: "reader_mode",
      script: reader,
      mutation_mode: mutation_modes.once_per_bunch,
   });
script_runner.run()
