import './style.css';
import * as util from '../util/common.js'
import * as j_util from '../util/jq.js'
import * as w_util from '../util/window.js'
import * as d_util from '../util/dom.js'
import * as c_util from '../util/css.js'
import { ScriptRunner, mutation_modes } from "../script_runner.js";
import { CacheUrlLoader } from "../cache_url_loader.js"
import { SyncSession } from "./sync_session.js"
import { ImageLoader } from "./image_loader.js"
import { PageAnalyzer } from './page_analyser.js'
import { ImageSetter } from './image_setter.js'

let script_runner;

class Reader {
   constructor() {
      this.cache_url_loader = new CacheUrlLoader(() => { this.onReload() })

      this.sync_session = new SyncSession()
      this.page_analyser = null
      this.image_loader = null
      this.image_setter = null

      this.loaded_config = null
      this.config_by_url = null
      this.config = null

      this.any_url_matched = false
      this.is_runned = false

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
      for (let [k, v] of Object.entries(this.loaded_config)) {
         if (k === 'common') continue
         let url_regex = util.urlToRegex(v.url);
         if (!url_regex.test(window.location.href))
            continue;
         this.any_url_matched = true
         util.merge_obj(config, v)
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
      if (this.is_runned)
         return
      this.is_runned = true
      this.sync_session.run()
      this.image_setter.run()
      window.addEventListener("resize", this.onResizeCall);
      if (this.config.next)
         window.addEventListener("scroll", this.onScrollCall);
   }

   stop() {
      if (!this.is_runned)
         return
      this.is_runned = false
      this.sync_session.stop()
      this.image_loader.stop()
      this.image_setter.stop()
      if (script_runner)
         script_runner.stop()
      window.removeEventListener("resize", this.onResizeCall);
      window.removeEventListener("scroll", this.onScrollCall);
   }

   async onLoad() {
      this.config = this.build_config_by_width(this.config_by_url)

      this.page_analyser = new PageAnalyzer(this.config)
      this.image_setter = new ImageSetter(this.config, this.page_analyser)
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

   onResize() {
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

   async onReload() {
      // await this.init()
      // await this.onLoad()
      // this.image_loader.onReload({ config: this.config.wallpapers })
   }

   async onUrlUpdate() {
      this.config_by_url = this.build_config_by_url()
      if (!this.any_url_matched)
         return this.stop()
      this.onResize()
   }

   onError() {
      this.image_loader.onError()
      this.cache_url_loader.onError()
   }

   async onMutation() {
      if (!this.any_url_matched) return
      await this.prepareNewPage()
   }

   update_css() {
      const known_name = ['default', 'content', 'comment', 'parents', 'siblings', 'body', 'text',]
      for (const name of known_name) {
         let config_key = 'css_' + name
         let css_name = c_util.css_name(name)
         let config_props = this.config[config_key]
         if (!config_props) continue
         c_util.set_css_class_property(css_name, config_props)
      }

      for (const class_name of ['content', 'comment', 'parents', 'siblings'])
         c_util.set_class_width(class_name, this.config.div_width)
   }

   async prepareNewPage() {
      let conf = this.config
      if (conf.remove)
         conf.remove.forEach(e => j_util.jq(e).remove());
      if (conf.hide)
         conf.hide.forEach(e => j_util.jq(e).hide());

      if (conf.is_reader === false)
         return

      let divs = this.page_analyser.get_divs()
      if (divs.length === 0)
         return
      await this.add_div_css(divs);
      await this.add_body_css()
      this.fix_text()
   }

   async add_div_css(divs) {
      let excluded = j_util.get_elements_by_query_arr(this.config.ignore)
      let w = this.config.div_width
      let already_marked = [...divs]
      for (let i = 0; i < divs.length; i++) {
         let style_name = i == 0 ? 'content' : 'comment'
         let div = divs[i]
         await c_util.generate_css_by_class(div, ['default', style_name], excluded)
         for (let sibling of d_util.get_node_siblings(div)) {
            if (already_marked.includes(sibling)) continue
            await c_util.generate_css_by_class(sibling, ['default', 'siblings'], excluded)
            already_marked.push(sibling)
         }
         for (let parent of d_util.get_node_parents(div)) {
            if (already_marked.includes(parent)) continue
            if (!(parent.offsetWidth && parent.offsetWidth > w)) {
               await c_util.generate_css_by_class(parent, ['default', 'parents'], excluded)
            } else
               await c_util.generate_css_by_class(parent, 'default', excluded)
            already_marked.push(parent)
            for (let sibling of d_util.get_node_siblings(parent)) {
               if (already_marked.includes(sibling)) continue
               await c_util.generate_css_by_class(sibling, ['default', 'siblings'], excluded)
               already_marked.push(sibling)
            }
         }
      }
      await c_util.generate_css_by_class(divs[0], 'text', excluded, true)
   }

   async add_body_css() {
      let excluded = j_util.get_elements_by_query_arr(this.config.ignore)
      await c_util.generate_css_by_class(document.body, 'body', excluded)
   }

   fix_text() {
      let torn_out_nodes = this.page_analyser.get_torn_out_nodes()
      for (let [node, parent] of torn_out_nodes)
         this.join_sentence(node, parent)
   }

   join_sentence(node, parent) {
      let parent_text_nodes = d_util.get_text_nodes(parent)
      let text = parent_text_nodes.map(x => x.textContent)
      let final_sentence = text.join("")
      let is_text_inserted = false

      for (let text_node of parent_text_nodes) {
         if (!is_text_inserted && node !== text_node) {
            text_node.textContent = final_sentence
            is_text_inserted = true
            continue
         }
         text_node.parentNode.removeChild(text_node)
      }
   }

   async set_image(image) {
      await this.image_setter.set(image)
   }

   onScroll() {
      if (!w_util.is_scroll_to_bottom()) return
      if (!this.config.next) return
      let next_buttons = util.toArr(this.config.next)
      for (let query of next_buttons) {
         let x = j_util.jq(query).get(0)
         if (x) x.click();
      }
   }
}

let reader = new Reader();
await reader.init_promise;

script_runner = new ScriptRunner(
   {
      name: "reader_mode",
      onLoad: async () => { await reader.onLoad() },
      onMutation: async () => { await reader.onMutation() },
      onUrlUpdate: async () => { return await reader.onUrlUpdate() },
      mutation_mode: mutation_modes.once_per_bunch,
   });
script_runner.run()