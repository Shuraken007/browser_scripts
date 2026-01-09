// ==UserScript==
// @name         Google auto consent
// @version      0.0.1
// @description  save redirect url with token automatically
// @author       Shuraken007
// @include      https://accounts.google.com/*signin*

// @grant        GM.setValue
// @grant        GM.xmlHttpRequest

// @run-at       document-ready

// ==/UserScript==
{
   async function delay(ms) {
      return new Promise(resolve => setTimeout(resolve, ms))
   }

   async function xmlHttpRequestPost(url, data, headers = { 'Content-Type': 'application/x-www-form-urlencoded' }) {
      return new Promise((resolve, reject) => {
         GM.xmlHttpRequest({
            method: 'POST',
            url: url,
            data: data,
            headers,
            onload: response => {
               return resolve(response)
            },
            onabort() {
               reject(new DOMException("Aborted", "AbortError"));
            },
            ontimeout() {
               reject(new TypeError("Network request failed, timeout"));
            },
            onerror(err) {
               reject(new TypeError("Failed to fetch: " + err.finalUrl));
            },
         });
      })
   }

   function boolean_convertor(key, value) {
      switch (typeof value) {
         case 'boolean':
            return Number(value)
      }
      return value
   }

   class Approver {
      get_url_part() {
         let part = window.location.href
            .split('&')
            .find(x => x.startsWith('part'))
         if (!part) return null
         return part.replace('part=', '')
      }

      constructor(configs) {
         this.app_config = configs.app_config
         this.scope_config = configs.scope_config
         this.wiz_config = configs.wiz_config
         this.url_params = new URLSearchParams(window.location.search)
         this.url = "/signin/oauth/v2/consentsummary"
      }

      async send_request() {
         let url = this.build_url()
         let payload_data = this.build_payload()
         let headers = { 'X-Same-Domain': '1', "Google-Accounts-XSRF": "1", 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' }
         let response = null
         try {
            response = await xmlHttpRequestPost(url, payload_data, headers)
         } catch (err) {
            console.log(`failed to send google auth post`)
            console.log(err)
         }
         await this.process_response(response)
      }

      async process_response(response) {
         let array_as_str = response.response.replace(")]}'\n", "")
         let resp_array = JSON.parse(array_as_str)
         let redirect_url = resp_array[0][0][1][2]
         console.log(redirect_url)
         localStorage.setItem('last_redirect_url', redirect_url)
         GM.setValue('last_redirect_url', redirect_url)
      }

      get_req_id() {
         let d = new Date()
         let req_id = d.getHours() * 3600 + d.getMinutes() * 60 + d.getSeconds()
         req_id += 1
         return req_id
      }

      build_url() {
         let params = {
            authuser: this.url_params.get('authuser'),
            as: this.url_params.get('as'),
            hl: 'ru',
            _reqid: this.get_req_id(),
            rt: "j"
         }
         let url = new URL("https://accounts.google.com/signin/oauth/consent/approval")
         // let url = new URL("localhost:3354/signin/oauth/consent/approval")
         url.search = new URLSearchParams(params).toString()
         return url.href
      }

      build_payload() {
         let data_arr = [
            'f.req', this.build_f_req(),
            'at', this.get_at(),
            'azt', this.get_azt(),
            'cookiesDisabled', 'false',
            'deviceinfo', this.get_device_info(),
            'gmscoreversion', 'null',
            'flowName', 'undefined',
         ]
         let data_str = ''
         for (let i = 0; i < data_arr.length; i += 2) {
            let key = encodeURIComponent(data_arr[i])
            let value = encodeURIComponent(data_arr[i + 1])
            data_str += `${key}=${value}&`
         }
         return data_str
      }

      get_at() {
         return Object.values(this.wiz_config)
            .filter(x => x instanceof Array)
            .filter(x => x[0] === "xsrf")?.[0]?.[1]
      }

      get_azt() {
         return Object.values(this.wiz_config)
            .filter(x => x instanceof Array)
            .filter(x => x[0] === "xsrf")?.[0]?.[3]
      }

      get_device_info() {
         let settings = this.app_config[16]
         let device_info = [
            null, null, null, null, null, "RU", null, null, null, null, null,
            settings,
            null, null, null, null,
            true, null, false, true, "", null, null, 2, true, 2
         ]
         return JSON.stringify(device_info, boolean_convertor)
      }

      build_f_req() {
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

   function get_config(attr_name) {
      let config_div = document.querySelector(`div[${attr_name}]`)
      if (!config_div) return null
      let config_str = config_div.getAttribute(attr_name)
      if (!config_str) return null
      config_str = config_str.replaceAll("%.@.", "[")
      let config = JSON.parse(config_str)
      return config
   }

   function get_script(include_str) {
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

   function collect_configs() {
      let configs = {
         app_config: get_config('data-app-config'),
         scope_config: get_config('data-scope-approval-data'),
         initial_config: get_config('data-initial-setup-data'),
         wiz_config: get_script('window.WIZ_global_data = '),
      }
      let not_empty_configs_amount = Object.values(configs).filter(x => x).length
      if (not_empty_configs_amount !== 4)
         return
      return configs
   }

   async function approve() {
      let submitButton = document.querySelector('[id="submit_approve_access"]');
      if (!submitButton) return false

      let configs = collect_configs()
      if (!configs) return false

      let approver = new Approver(configs)
      await approver.send_request()
      // submitButton.click()
      return true
   }

   function selectAccount(mail) {
      let accountSelector = document.querySelector(`[data-identifier="${mail}"]`);
      if (!accountSelector) return false
      accountSelector.click()
      return true
   }

   async function auto_concent(mail, client_id) {
      if (!window.location.href.includes(client_id))
         return
      let is_approved = false
      while (!is_approved) {
         let url = window.location.href
         if (url.includes('accountchooser')) {
            selectAccount(mail)
         } else if (url.includes('consentsummary')) {
            is_approved = await approve()
         }
         await delay(500)
      }
   }

   async function main() {
      await delay(2000)
      let mail = "some_mail@gmail.com"
      let client_id = "some_client_id.apps.googleusercontent.com"
      await auto_concent(mail, client_id)
   }

   main()

}