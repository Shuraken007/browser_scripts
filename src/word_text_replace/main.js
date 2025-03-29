import { ScriptRunner } from "../script_runner.js";
import { rnd_from_arr, isString, escapeRegexChars } from "../util/common.js";
import { get_text_nodes } from "../util/dom.js";
import { CacheUrlLoader } from "../cache_url_loader.js"
import { ClickDetector } from "./click_detector.js";
import { ReplacementBuilder } from "./replacement_builder.js";
import { ChineseConvertor } from "./chinese_convertor.js";

async function replaceText(node, replacements, replaced_nodes, runner) {
   let text_nodes = get_text_nodes(node, false)
   for (let node of text_nodes) {
      let text = node.textContent;
      // console.log(node.nodeType, node.nodeValue)
      let new_text = await make_replacements(text, replacements, runner);
      if (text != new_text) {
         node.textContent = new_text;
         if (replaced_nodes.has(node)) break;
         replaced_nodes.set(node, text);
         // console.log(`${text}->${new_text}`);
      }
   }
}

async function make_replacements(text, replacements, runner) {
   var are_letters_inserted = false;
   if (runner.builder.is_simple_chinese) {
      text = await runner.chinese_convertor.convert(text);
   }
   for (let [regex, replacement] of replacements) {
      if (replacement instanceof Array) {
         replacement = rnd_from_arr(replacement);
      }
      let not_glyph_letter_in_replacement = isLetter(replacement.charAt(0)) || isLetter(replacement.slice(-1));
      if (are_letters_inserted && not_glyph_letter_in_replacement) {
         text = replaceAllRespectSpaces(text, regex, replacement);
      } else {
         var new_text = text.replaceAll(regex, replacement);
         if (!are_letters_inserted && new_text != text && not_glyph_letter_in_replacement) {
            are_letters_inserted = true;
         }
         text = new_text;
      }
   }
   return text;
}

function isLetter(c) {
   return c.toLowerCase() != c.toUpperCase();
}

function is_space_required(text, index) {
   if (index == 0) { return false; }
   if (!isLetter(text.charAt(index - 1))) { return false; }
   return true;
}

function replaceAllRespectSpaces(text, re, replacement) {
   // if (!isLetter(replacement.charAt(0))) { return text; }
   if (isString(re)) {
      re = new RegExp(escapeRegexChars(re));
   } else if (re instanceof RegExp && re.global) {
      re = new RegExp(re.source, re.flags.replace('g', ''));
   }
   var match;
   let i = 0;
   let old_text = text;
   while (true) {
      match = re.exec(text)
      if (!match) break;

      if (is_space_required(text, match.index)) {
         text = text.replace(match, " " + replacement);
      } else {
         text = text.replace(re, replacement);
      }

      let new_part = text.substring(match.index)
      let old_part = old_text.substring(match.index)
      if (new_part.includes(old_part) && new_part.length > old_part.length) {
         // console.log("recursive detected")
         break
      }

      old_text = text

      i++;
      if (i > 100) { throw Error(`re ${re} exceeded 100 iterations on ${text}`) }
   }
   return text;
}

class Replacer {
   constructor() {
      this.on = true;
      this.cache_url_loader = new CacheUrlLoader();
      this.replaced_nodes = new Map();
      this.replacements = null;
   }

   async init() {
      this.config = await this.cache_url_loader.load(CONFIG_URL)
      if (this.config.word_text_replace !== null)
         this.config = this.config.word_text_replace

      this.chinese_convertor = new ChineseConvertor(this.config.chinese_map)
      this.builder = new ReplacementBuilder({
         replacements_url: this.config.replacements,
         chinese_convertor: this.chinese_convertor,
         level: this.config.replacements_default_level || 1,
         onUpdate: () => { this.update_replacements() },
      });
      this.click_detector = new ClickDetector(
         this.config.binds.n,
         this.config.binds.m,
         this.config.binds.click_interval,
         this.prepare_event_config(this.config.binds.events)
      );
      this.preLoad()
   }

   async preLoad() {
      this.promised_replacements = this.builder.run();
   }

   prepare_event_config(events) {
      let event_config = []
      for (const [callback_name, indexes] of Object.entries(events)) {
         let callback = () => { this[callback_name]() }
         event_config.push([indexes, callback])
      }
      return event_config
   }

   async onLoad() {
      this.replacements = await this.promised_replacements
         .catch(err => { this.onError(err) });

      // console.log(`main started in: ${Date.now() - script_start}`);
      // console.log("config loaded!");
      if (!this.replacements || this.replacements.length == 0) {
         console.log("no replacements for this site!");
         return;
      }
      // console.log(this.replacements)
      this.replace();

      window.addEventListener('click',
         event => this.click_detector.on_click(event));

      this.builder.use_cache = false
      this.builder.cache_url_loader.use_cache = false
   }

   replace(node = document.body) {
      if (!this.on) return;
      replaceText(node, this.replacements, this.replaced_nodes, this);
   }

   revert_nodes() {
      if (!this.on) return;
      for (let [node, text] of this.replaced_nodes) {
         node.textContent = text;
      }
   }

   swap_on_off() {
      if (this.on) {
         this.revert_nodes()
         this.on = false
      } else {
         this.on = true
         this.replace()
      }
   }

   async update_replacements() {
      this.replacements = await this.builder.run()
         .catch(err => { this.onError(err) });
      this.revert_nodes();
      // console.log(this.replacements)
      this.replace();
   }

   onError(err) {
      this.cache_url_loader.onError()
      this.builder.onError()
      throw err
   }

}

let replacer = new Replacer();
await replacer.init();
let script_runner = new ScriptRunner(
   {
      name: "word_text_replace",
      onLoad: async () => { await replacer.onLoad() },
      onMutation: async (node) => { await replacer.replace(node) },
      onError: async (err) => { await replacer.onError(err) },
   });
script_runner.run()