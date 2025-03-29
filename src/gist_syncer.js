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

   async send(data) {
      if (!this.on) return
      let enc_data = JSON.stringify(data);

      if (this.last_get_data && this.last_get_data === enc_data) {
         console.log(`no sync cause got same data: ${this.last_get_data}`)
         return
      }

      let content = {
         files: {
            [GIST_CONFIG.file]: {
               content: enc_data
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

   async get() {
      if (!this.on) return
      let res = await fetch(this.url + GIST_CONFIG.id)
      let data = await res.text()
      let json = JSON.parse(data)
      if (json.message && json.message.includes('API rate limit exceeded'))
         json = { files: { [GIST_CONFIG.file]: { content: "{}" } } }
      let file_content = json.files[GIST_CONFIG.file].content
      this.last_get_data = file_content
      let file_json = JSON.parse(file_content)
      return file_json
   }

   onError() {
      this.last_get_data = null
   }
}