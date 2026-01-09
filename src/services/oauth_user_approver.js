import { delay, fetchGM } from '../util/common.js'

const APPROVE_URL = "https://accounts.google.com/signin/oauth/consent/approval"

export function is_url_match(client_id) {
   let url = window.location.href
   if (!url.includes('accounts.google.com'))
      return false
   if (!url.includes('signin'))
      return false
   if (!url.includes(client_id))
      return false
   return true
}

class DataCollector {
   static get_script(include_str) {
      let scripts = Array.from(document.querySelectorAll('script'))
         .filter(x => x.textContent.includes(include_str))
         .map(x => x.textContent)
      if (scripts.length === 0)
         return
      let json_str = scripts[0]
         .replaceAll('%.@.', '[')
         .match(/{.+}/)
         ?.[0]
      if (!json_str)
         return
      let json = JSON.parse(json_str)
      for (let [key, value] of Object.entries(json)) {
         if (typeof value === 'string' && value.startsWith('[')) {
            json[key] = JSON.parse(value)
         }
      }
      return json
   }

   static get_config(attr_name) {
      let config_div = document.querySelector(`div[${attr_name}]`)
      if (!config_div) return null
      let config_str = config_div.getAttribute(attr_name)
      if (!config_str) return null
      config_str = config_str.replaceAll("%.@.", "[")
      let config = JSON.parse(config_str)
      return config
   }

   static collect_configs() {
      let configs = {
         app_config: DataCollector.get_config('data-app-config'),
         scope_config: DataCollector.get_config('data-scope-approval-data'),
         initial_config: DataCollector.get_config('data-initial-setup-data'),
         wiz_config: DataCollector.get_script('window.WIZ_global_data = '),
      }
      let vals = Object.values(configs)
      if (vals.length !== vals.filter(x => x).length)
         return
      return configs
   }
}

function boolean_convertor(key, value) {
   switch (typeof value) {
      case 'boolean':
         return Number(value)
   }
   return value
}

class ApproveRequestBuilder {
   constructor(configs) {
      this.app_config = configs.app_config
      this.scope_config = configs.scope_config
      this.wiz_config = configs.wiz_config
      this.url_params = new URLSearchParams(window.location.search)
   }

   get_headers() {
      return {
         'X-Same-Domain': '1',
         "Google-Accounts-XSRF": '1',
         'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8'
      }
   }

   get_url() {
      let params = {
         authuser: this.url_params.get('authuser'),
         as: this.url_params.get('as'),
         hl: 'ru',
         _reqid: this._get_req_id(),
         rt: "j"
      }
      let url = new URL(APPROVE_URL)
      url.search = new URLSearchParams(params).toString()
      return url.href
   }

   get_data() {
      let params = {
         'f.req': this._get_f_req(),
         at: this._get_at(),
         azt: this._get_azt(),
         cookiesDisabled: 'false',
         deviceinfo: this._get_device_info(),
         gmscoreversion: 'null',
         flowName: 'undefined',
      }
      return new URLSearchParams(params).toString() + '&'
   }

   _get_req_id() {
      let d = new Date()
      let req_id = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
      req_id += 1
      return req_id
   }

   _get_at() {
      return Object.values(this.wiz_config)
         .filter(x => x instanceof Array)
         .filter(x => x[0] === "xsrf")?.[0]?.[1]
   }

   _get_azt() {
      return Object.values(this.wiz_config)
         .filter(x => x instanceof Array)
         .filter(x => x[0] === "xsrf")?.[0]?.[3]
   }

   _get_device_info() {
      let settings = this.app_config[16]
      let device_info = [
         null, null, null, null, null, "RU", null, null, null, null, null,
         settings,
         null, null, null, null,
         true, null, false, true, "", null, null, 2, true, 2
      ]
      return JSON.stringify(device_info, boolean_convertor)
   }

   _get_f_req() {
      let settings = this.app_config[16]
      if (!settings instanceof Array) {
         console.log('app_config[16] not Array, smth gone wrong')
         return null
      }
      let scope_settings = this.scope_config.filter(
         x => x instanceof Array || typeof x === 'string'
      )
      let part = this.url_params.get('part')
      if (!part)
         throw new Error('location.href expected to have "part" param')
      let arr = [1, settings[3], part, null, scope_settings, settings]
      return JSON.stringify(arr, boolean_convertor)
   }
}

export class AutoApprover {
   constructor() {
      let creds = JSON.parse(G_CREDS)
      this.client_id = creds.client_id

      this.mail = USER_MAIL
   }

   async run() {
      if (!is_url_match(this.client_id)) return

      let is_approved = false
      while (!is_approved) {
         let url = window.location.href
         if (url.includes('accountchooser')) {
            this.selectAccount(this.mail)
         } else if (url.includes('consentsummary')) {
            is_approved = await this.imitate_approve()
         }
         await delay(500)
      }
   }

   selectAccount(mail) {
      let accountSelector = document.querySelector(`[data-identifier="${mail}"]`);
      if (!accountSelector) return false
      accountSelector.click()
      return true
   }

   async imitate_approve() {
      let submitButton = document.querySelector('[id="submit_approve_access"]');
      if (!submitButton) return false

      let configs = DataCollector.collect_configs()
      if (!configs) return false

      let req_builder = new ApproveRequestBuilder(configs)
      let [encoded_response, response] = await fetchGM(
         req_builder.get_url(),
         req_builder.get_headers(),
         "POST",
         req_builder.get_data(),
      )

      if (!encoded_response) {
         console.log(response)
         throw new Error(`Failed on imitated approve fetch`)
      }

      let redirect_url = this.decode_response(encoded_response)

      console.log(redirect_url)
      await GM.setValue('last_redirect_url', redirect_url)

      return true
   }

   decode_response(encoded_response) {
      let array_as_str = encoded_response.replace(")]}'\n", "")
      let resp_array = JSON.parse(array_as_str)
      let redirect_url = resp_array[0][0][1][2]
      return redirect_url
   }
}