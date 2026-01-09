import { GToken } from "./g_token.js"
import { fetchGM } from "../util/common.js"

const DRIVE_URL = "https://www.googleapis.com/drive/v3/"
const UPLOAD_DRIVE_URL = "https://www.googleapis.com/upload/drive/v3/"

export class GDrive {
   constructor() {
      this.g_token = new GToken(['drive'])
   }

   async auth_fetch(url, headers = {}, method, data) {
      let all_headers = {
         "Authorization": "Bearer " + await this.g_token.get(),
         ...headers
      }
      return await fetchGM(url, all_headers, method, data)
   }

   async send_query(query) {
      let url = new URL(DRIVE_URL + 'files')
      url.searchParams.set('q', query)

      let [response, full_response] = await this.auth_fetch(
         url.href,
         { "Content-Type": "application/json" }
      )
      return response
   }

   async get_folder_id(folder_name) {
      let query = [
         'trashed = false', 'and',
         'mimeType = "application/vnd.google-apps.folder"', 'and',
         `name = "${folder_name}"`
      ].join(' ')
      let response = await this.send_query(query)
      if (!response) return null

      let folders = response.files
      if (folders.length === 0)
         return null
      if (folders.length > 1) {
         console.log(`expected only one folder ${folder_name}, got ${folders.length}`)
         console.log(response)
         return null
      }

      return folders[0].id
   }

   async test_func(folder_name, file_name) {
      let folder_id = await this.get_folder_id(folder_name)
      if (!folder_id)
         return null

      let query = [
         'trashed = false', 'and',
         'mimeType != "application/vnd.google-apps.folder"', 'and',
         `name = "${file_name}"`, 'and',
         `'${folder_id}' in parents`
      ].join(' ')
      let response = await this.send_query(query)
      console.log(response)
      if (!response) return null

      let files = response.files
      if (files.length === 0)
         return null
      if (files.length > 1) {
         console.log(`expected only one file ${file_name}, got ${files.length}`)
         console.log(response)
         return null
      }
      return files[0].id
   }

   // checks that folder exists and file also in that folder
   async get_file_id(folder_id, file_name) {
      let query = [
         'trashed = false', 'and',
         'mimeType != "application/vnd.google-apps.folder"', 'and',
         `name = "${file_name}"`, 'and',
         `'${folder_id}' in parents`
      ].join(' ')
      let response = await this.send_query(query)

      if (!response) return null

      let files = response.files
      if (files.length === 0)
         return null
      if (files.length > 1) {
         console.log(`expected only one file ${file_name}, got ${files.length}`)
         console.log(response)
         return null
      }
      return files[0].id
   }

   async load_file(folder_name, file_name) {
      let folder_id = await this.get_folder_id(folder_name)
      if (!folder_id)
         return null

      let file_id = await this.get_file_id(folder_id, file_name)
      if (!file_id)
         return null

      let [response, _] = await this.auth_fetch(
         DRIVE_URL + `files/${file_id}?alt=media`,
         { "Content-Type": "application/json" }
      )
      return response
   }

   async create_file(folder_id, file_name, data) {
      let metadata = {
         name: file_name,
         parents: [folder_id],
         mimeType: 'text/plain',
      }
      var form = new FormData()
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))
      form.append('file', new Blob([data], { type: "text/plain" }))

      let [response, _] = await this.auth_fetch(
         UPLOAD_DRIVE_URL + `files?uploadType=multipart`,
         {},
         "POST",
         form
      )
      return response?.id
   }

   async create_folder(folder_name) {
      let metadata = {
         name: folder_name,
         mimeType: 'application/vnd.google-apps.folder',
      }
      var form = new FormData()
      form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }))

      let [response, full_response] = await this.auth_fetch(
         UPLOAD_DRIVE_URL + `files`,
         {},
         "POST",
         form
      )
      return response?.id
   }

   async update_file(file_id, data) {
      let [response, _] = await this.auth_fetch(
         UPLOAD_DRIVE_URL + `files/${file_id}`,
         {},
         "PATCH",
         new Blob([data], { type: "text/plain" })
      )
      // console.log(response)
   }

   async upload_file(folder_name, file_name, data) {
      let folder_id = await this.get_folder_id(folder_name)
      if (!folder_id)
         folder_id = await this.create_folder(folder_name)
      if (!folder_id)
         return null

      let file_id = await this.get_file_id(folder_id, file_name)

      if (file_id) {
         this.update_file(file_id, data)
      } else {
         this.create_file(folder_id, file_name, data)
      }
   }
}