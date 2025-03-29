import { delay } from '../util/common.js'
import { createWorker } from 'tesseract.js';

function is_cover() {
   let root = [...document.querySelectorAll('div')].filter(x => x.shadowRoot)
   if (root.length === 0) return null
   let cover = root[0].shadowRoot.firstChild.querySelector('div.cover')
   if (!cover) return false
   return true
}

function get_next_btn() {
   let next_btn_arr = [...document.querySelectorAll('div.cursor-pointer')].filter(x => x.firstChild.alt === "다음")
   if (next_btn_arr.length === 0) return null
   return next_btn_arr[0]
}

function get_next_chapter_btn() {
   return document.querySelector('div[data-test="viewer-navbar-next-button"]')
}

function get_paragraphs() {
   let root = [...document.querySelectorAll('div')].filter(x => x.shadowRoot)
   if (root.length === 0) return null
   let paragraphs = [...root[0].shadowRoot.firstChild.getElementsByTagName('p')]
   if (paragraphs.length === 0) return null
   return paragraphs
}

function allow_copy() {
   let root = [...document.querySelectorAll('div')].filter(x => x.shadowRoot)
   if (root.length === 0) return null
   root[0].shadowRoot.firstChild.style.userSelect = 'text'
}

function get_book_chapter() {
   let path_arr = window.location.href.split('/')
   let chapter = path_arr.pop()
   path_arr.pop()
   let book = path_arr.pop()
   return [book, chapter]
}

function save_paragraphs(paragraphs) {
   let [book, chapter] = get_book_chapter()
   let storage = localStorage.getItem(`kakao_saver_${book}`) || '{}'
   storage = JSON.parse(storage)
   storage[chapter] = paragraphs.map(x => x.textContent).join('\n')
   localStorage.setItem(`kakao_saver_${book}`, JSON.stringify(storage))
   console.log(`saved ${paragraphs.length} paragraphs for ${chapter} chapter`)
}

function save_image_urls(urls) {
   let [book, chapter] = get_book_chapter()
   let storage = localStorage.getItem(`kakao_saver_urls_${book}`) || '{}'
   storage = JSON.parse(storage)
   storage[chapter] = urls
   localStorage.setItem(`kakao_saver_urls_${book}`, JSON.stringify(storage))
   console.log(`saved ${urls.length} urls for ${chapter} chapter`)
}

function get_image_urls() {
   let urls = [...document.querySelectorAll('img[src*="sdownload/resource"]')]
      .map(img => img.src)
      .filter(x => x.includes('png'))
   if (urls.length === 0)
      return null
   return urls
}

function copy_urls() {
   let [book, _] = get_book_chapter()
   let storage = localStorage.getItem(`kakao_saver_urls_${book}`) || '{}'
   console.log('copy this ursl:')
   console.log(storage)
   console.log('run on any page without cross-domain polycy: window.kk_recognize_img(COPIED_URLS)')
}

function save() {
   let [book, _] = get_book_chapter()
   let storage = localStorage.getItem(`kakao_saver_${book}`) || '{}'
   storage = JSON.parse(storage)
   let sorted_pairs = Object.entries(storage).sort(([, a], [, b]) => Number(b) - Number(a))
   if (sorted_pairs.length === 0) {
      console.log("nothing to print, no chapters")
      return
   }
   let chapters = []
   let chapter_rel_number = 1
   for (let [chapter_abs_number, chapter] of sorted_pairs) {
      chapters.push(`Глава ${chapter_rel_number} | ${chapter_abs_number}\n\n`)
      chapters.push(chapter)
      chapters.push("\n\n=======================\n\n")
      chapter_rel_number++;
   }
   let file_name = `kakao-${book}_book-${sorted_pairs.length}_chapters-${Date.now()}.txt`;
   save_to_file(chapters.join(''), file_name)
   console.log(`printed ${sorted_pairs.length} chapters`)
   console.log(`first started with ${sorted_pairs[0][1].substring(0, 10)}`)
   console.log(`last ended with ${sorted_pairs[sorted_pairs.length - 1][1].slice(-10, -1)}`)
}

function save_to_file(str, file_name, type = 'text/plain;charset=utf-8') {
   const blob = new Blob([str], { type: type });
   const link = document.createElement('a');
   link.href = URL.createObjectURL(blob);
   link.download = file_name;
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
}

function select_and_load_file(contentType) {
   return new Promise(resolve => {
      let input = document.createElement('input');
      input.type = 'file';
      input.accept = contentType;

      input.onchange = () => {
         let files = Array.from(input.files);
         var reader = new FileReader();
         reader.readAsText(files[0], 'UTF-8');
         reader.onload = readerEvent => {
            var content = readerEvent.target.result; // this is the content!
            console.log(content);
            resolve()
         }
      };

      input.click();
   });
}

let states = {
   cover: "cover",
   text: "text",
   img: "img",
   next: "next",
}

class Scrapper {
   constructor() {
      this.worker = null
      this.init_promise = this.init()
      this.onNavigateFunc = () => { this.run() }
   }

   async init() {
      this.worker = await createWorker('eng');
      window.navigation.addEventListener("navigate", this.onNavigateFunc)
      // const ret = await worker.recognize('https://tesseract.projectnaptha.com/img/eng_bw.png');
      // console.log(ret.data.text);
   }

   async scroll_to_end() {
      while (!get_next_btn().classList.contains('opacity-30')) {
         const event = new KeyboardEvent('keydown', {
            key: 'ArrowRight',
            keyCode: 39,
            code: 'ArrowRight',
            which: 39,
            bubbles: true,
            cancelable: true
         });
         document.dispatchEvent(event);
         await delay(10)
      }
   }

   async scroll_next_chapter() {
      let cur_page = document.body.innerHTML
      let next_chapter_btn = get_next_chapter_btn()
      next_chapter_btn.click()
      let timeout = 10 * 1000
      let start = Date.now()
      while (Date.now() - start < timeout) {
         if (document.body.innerHTML !== cur_page && get_next_btn())
            return true
         await delay(200)
      }
      return false
   }

   async scan_img() {
      window.navigation.removeEventListener("navigate", this.onNavigateFunc)
      let start = Date.now()
      while (true) {
         if (!get_next_btn())
            continue

         await this.scroll_to_end()
         let urls = get_image_urls()
         if (!urls) {
            console.log('no image urls on page')
            break
         }
         save_image_urls(urls)
         let res = await this.scroll_next_chapter()
         if (res === false) {
            console.log("can't swap next chapter")
            break
         }

         await delay(200)
      }
      let total_sec = Math.ceil((Date.now() - start) / 1000)
      console.log(`loaded in ${total_sec} sec`)
   }

   async kk_recognize_img(urls) {
      console.log(urls)
   }

   async auto() {
      window.navigation.removeEventListener("navigate", this.onNavigateFunc)
      let state = states.cover
      let start = Date.now()
      let last_change = Date.now()
      const max_wait_sec = 30
      while (true) {
         switch (state) {
            case states.cover:
               if (!is_cover()) break
               let btn = get_next_btn()
               if (!btn) break
               btn.click()
               state = states.text
               last_change = Date.now()
               break;
            case states.text:
               if (is_cover()) {
                  state = states.cover
                  break
               }
               let paragraphs = get_paragraphs()
               if (!paragraphs) break
               save_paragraphs(paragraphs)
               state = states.next
               last_change = Date.now()
               break;
            case states.next:
               let next_chapter_btn = get_next_chapter_btn()
               if (!next_chapter_btn) break
               next_chapter_btn.click()
               state = states.cover
               last_change = Date.now()
               break;
         }
         await delay(200)
         if (Date.now() - last_change > max_wait_sec * 1000)
            break
      }
      let total_sec = Math.ceil((Date.now() - start) / 1000) - max_wait_sec
      console.log(`loaded in ${total_sec} sec`)
   }

   async run() {
      await delay(2000) // avoid save prev. chapter data
      let paragraphs;
      while (!paragraphs || is_cover()) {
         paragraphs = get_paragraphs()
         await delay(200)
      }
      save_paragraphs(paragraphs)
      allow_copy()
   }
}

let scrapper = new Scrapper()
await scrapper.init_promise
scrapper.run()

// ручное управление
Object.assign(window, {
   kk_save: () => { save() },
   kk_auto: () => { scrapper.auto() },
   kk_scan_img: () => { scrapper.scan_img() },
   kk_copy_urls: copy_urls,
   kk_recognize_img: (urls) => { scrapper.kk_recognize_img(urls) },
});