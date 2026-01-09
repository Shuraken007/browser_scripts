import { GDrive } from '../services/g_drive.js'
import { IntervalRunner } from '../util/interval_runner.js';

export class SyncSession {
   constructor(sync_interval_min = 60, storage, folder_name, file_name) {
      this.folder_name = folder_name
      this.file_name = file_name
      this.g_drive = new GDrive()
      this.storage = storage

      this.interval_runner = new IntervalRunner({
         name: 'session',
         interval_min: sync_interval_min,
         callback: () => { this.sync() }
      })
   }

   async run() {
      this.interval_runner.run()
   }

   stop() {
      this.interval_runner.stop()
   }

   async sync() {
      console.log('Syncing')
      let local_data = this.storage.get()
      let remote_data = await this.g_drive.load_file(this.folder_name, this.file_name) || {}
      let local_data_str = JSON.stringify(local_data)
      let remote_data_str = JSON.stringify(remote_data)

      if (local_data_str.length > remote_data_str.length) {
         let pretty_str = JSON.stringify(local_data, null, 3)
         await this.g_drive.upload_file(this.folder_name, this.file_name, pretty_str)
      } else if (local_data_str.length < remote_data_str.length) {
         this.storage.set(remote_data)
      }
   }
}