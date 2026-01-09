export class GistSyncer {
   validate_GIST_CONFIG() {
      if (!GIST_CONFIG) {
         console.log('gist config not defined');
         return false
      }
      let is_valid = true
      for (let item of ['token', 'id', 'file']) {
         if (GIST_CONFIG[item] != null) continue
         console.log(`gist config: ${token} not defined`);
         is_valid = false
      }
      return is_valid
   }

   constructor() {
      this.on = this.validate_GIST_CONFIG()
      this.url = "https://api.github.com/gists/"
      this.last_get_data = ""
   }

   async send_text_content(data) {
      if (!this.on) return

      if (this.last_get_data && this.last_get_data === data) {
         console.log(`no sync cause got same data: ${this.last_get_data}`)
         return
      }

      let content = {
         files: {
            [GIST_CONFIG.file]: {
               content: data
            }
         }
      }
      let enc_content = JSON.stringify(content);
      fetch(this.url + GIST_CONFIG.id, {
         method: 'PATCH',
         body: enc_content,
         headers: {
            'Authorization': `Bearer ${GIST_CONFIG.token}`
         },
      })
   }

   async get_text_content() {
      if (!this.on) return
      let res = await fetch(this.url + GIST_CONFIG.id)
      let data = await res.text()
      let json = JSON.parse(data)
      if (json.message && json.message.includes('API rate limit exceeded'))
         return null

      let file_content = json.files[GIST_CONFIG.file].content
      this.last_get_data = file_content
      return file_content
   }

   onError() {
      this.last_get_data = null
   }
}