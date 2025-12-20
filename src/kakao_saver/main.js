import { delay } from '../util/common.js'
import { createWorker, createScheduler } from 'tesseract.js';

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
   storage = JSON.stringify(storage)
   localStorage.setItem(`kakao_saver_urls_${book}`, storage)
   GM_setValue('kakao_saver_img_urls', storage)
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

function save_text() {
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

let states = {
   cover: "cover",
   text: "text",
   img: "img",
   next: "next",
}

class Scrapper {
   constructor() { }

   async scroll_to_end() {
      this.log('try scroll')
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
         this.log('send ArrowRigth to scroll')
         await delay(10)
      }
   }

   async scroll_next_chapter() {
      this.log('try next chapter')
      let cur_page = document.body.innerHTML
      let next_chapter_btn = get_next_chapter_btn()
      next_chapter_btn.click()
      let timeout = 10 * 1000
      let start = Date.now()
      while (Date.now() - start < timeout) {
         if (document.body.innerHTML !== cur_page && get_next_btn())
            return true
         this.log('wait next chapter loaded')
         await delay(200)
      }
      return false
   }

   async scan_img() {
      let start = Date.now()
      this.log('scan_img started')
      while (true) {
         if (!get_next_btn()) {
            this.log('no next_btn')
            await delay(200)
            continue
         }

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

   async create_workers(n, sheduler) {
      for (let i = 0; i < n; i++)
         sheduler.addWorker(await createWorker('kor'))
   }

   async parse_img(start = 1, end = 10000) {
      let storage = GM_getValue('kakao_saver_img_urls') || '{}'
      let map_chapter_urls = JSON.parse(storage)
      if (map_chapter_urls === '{}') {
         console.log('no parsed urls')
      }
      let sorted_pairs = Object.entries(map_chapter_urls).sort(([, a], [, b]) => Number(b) - Number(a))
      if (sorted_pairs.length === 0) {
         console.log("nothing to parse, no chapters")
         return
      }
      const scheduler = createScheduler();
      await this.create_workers(5, scheduler)

      let chapter_rel_number = 1
      let chapters = []
      for (let [chapter_abs_number, urls] of sorted_pairs) {
         if (chapter_rel_number < start || chapter_rel_number > end) {
            chapter_rel_number++
            continue
         }
         let promises = []
         let pages = []
         let chapter_id = `${chapter_rel_number} | ${chapter_abs_number}`
         for (let i = 0; i < urls.length; i++) {
            let url = urls[i]
            let response = await GM.xmlHttpRequest({ url: url }).catch(e => console.error(e));
            console.log(response)
            // promises.push(scheduler.addJob('recognize', url))
         }
         console.log(`started chapter ${chapter_id}, analyzing ${urls.length} images`)
         await Promise.all(promises)
         for (let i = 0; i < promises.length; i++) {
            let res = await promises[i]
            if (!res.data || !res.data.text || res.data.text === '') {
               console.log(`can't recognise in chapter ${chapter_id}: url: ${urls[i]}`)
            }
            pages.push(res.data.text)
         }
         chapters.push(`Глава ${chapter_id}\n\n`)
         chapters.push(pages.join("\n"))
         chapter_rel_number++
      }
      scheduler.terminate()
      let file_name = `kakao_book-${sorted_pairs.length}_chapters-${Date.now()}.txt`;
      console.log(chapters.join(''))
      // save_to_file(chapters.join(''), file_name)
   }

   async scan_text() {
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

   log(msg) {
      if (!IS_DEBUG) return
      console.log(msg)
   }
}

let scrapper = new Scrapper()

// ручное управление
Object.assign(unsafeWindow, {
   kk_save_text: () => { save_text() },
   kk_scan_text: () => { scrapper.scan_text() },
   kk_scan_img: () => { scrapper.scan_img() },
   kk_parse_img: (...args) => { scrapper.parse_img(...args) },
});
console.log('kakao_saver started')