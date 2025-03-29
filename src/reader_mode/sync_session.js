import { GistSyncer } from '../gist_syncer.js';
import { IntervalRunner } from './interval_runner.js';

export const sessionFields = {
   likes: 'likes',
   dislikes: 'dislikes',
   chapter: 'chapter',
};

export class SyncSession {
   constructor(sync_interval_min = 10) {
      this.gist_syncer = new GistSyncer()
      this.s = {}
      this.storage_inited = false
      this.interval_runner = new IntervalRunner({
         name: 'session',
         interval_min: sync_interval_min,
         callback: () => { this.sync() }
      })
   }

   async init_storage() {
      if (this.storage_inited)
         return
      this.s = await this.gist_syncer.get()
      for (const key of Object.keys(sessionFields)) {
         if (this.s[key] == null) {
            this.s[key] = {}
         }
      }
      this.storage_inited = true
   }

   async run() {
      await this.init_storage()
      this.interval_runner.run()
   }

   stop() {
      this.interval_runner.stop()
   }

   async sync() {
      console.log('Syncing')
      this.chapter()
      console.log(this.s)
      this.gist_syncer.send(this.s)
      localStorage.setItem('read_mode_session_last_synced', Date.now());
   }

   like(item) {
      this.s[sessionFields.likes][item] = true
   }

   dislike(item) {
      this.s[sessionFields.dislike][item] = true
   }

   chapter() {
      let path_arr = window.location.href.split('/')
      let chapter = path_arr.pop()
      let path = path_arr.join('/')
      this.s[sessionFields.chapter][path] = chapter
   }

   sync_chapter() {
      let path_arr = window.location.href.split('/')
      let chapter = path_arr.pop()
      let path = path_arr.join('/')
      let was_chapter = this.s[sessionFields.chapter][path]
      if (!was_chapter) return
      let new_page = [path, was_chapter].join('/')
      window.location.replace(new_page);
   }

   async get(field) {
      await this.init_storage()
      if (!sessionFields[field])
         console.log(`unknown session field: ${field}`)
      return this.s[field]
   }
}