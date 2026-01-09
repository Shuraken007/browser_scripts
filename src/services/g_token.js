import { delay, fetchGM } from '../util/common.js'
import { GmCache } from "../util/gm_cache.js"

const SCOPE_URL = "https://www.googleapis.com/auth/"

class UserConcentUrlBuilder {
   constructor() {
      this.chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
   }

   _get_state(length = 30) {
      let result = "";
      for (let i = 0; i < length; i++) {
         result += this.chars.charAt(Math.floor(Math.random() * this.chars.length));
      }
      return result;
   }

   // imitate port for safe reasons, really don't need it
   _get_port() {
      let ports = [49000, 65535]
      let port = ports[0] + Math.floor(Math.random() * (ports[1] - ports[0]))
      return ':' + port
   }

   build(creds, scopes) {
      let params = {
         response_type: 'code',
         client_id: creds.client_id,
         redirect_uri: 'http://localhost' + this._get_port(),
         scope: scopes.map(x => SCOPE_URL + x).join(' '),
         state: this._get_state(),
         access_type: 'offline'
      }

      let url = new URL(creds.auth_uri)
      url.search = new URLSearchParams(params).toString()
      return url.href
   }
}

class TokenFlow {
   constructor(creds, scopes) {
      this.creds = creds
      this.scopes = scopes
   }

   async get() {
      let user_consent_url = new UserConcentUrlBuilder()
         .build(this.creds, this.scopes)

      let redirect_url = await this.get_redirect_url_from_user_concent(user_consent_url)
      if (!redirect_url) {
         return null
      }

      return await this.get_token(redirect_url)
   }

   async get_token(redirect_url) {
      let url = new URL(redirect_url)

      let params = {
         'client_id': this.creds.client_id,
         'client_secret': this.creds.client_secret,
         'code': url.searchParams.get('code'),
         'grant_type': 'authorization_code',
         'redirect_uri': url.origin
      }
      let data = new URLSearchParams(params).toString() + '&'

      let [token, _] = await fetchGM(
         this.creds.token_uri,
         { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
         "POST",
         data,
      )
      return token
   }

   async get_redirect_url_from_user_concent(user_consent_url) {
      // return await GM.getValue('last_redirect_url')
      GM.deleteValue('last_redirect_url')

      let timeout = Date.now() + 60 * 1000
      let redirect_url = null

      // open new tab, oauth_user_approver must capture and save 'redirect_url'
      let new_tab = await GM.openInTab(user_consent_url, true)
      while (Date.now() < timeout && !redirect_url) {
         await delay(1000)
         redirect_url = await GM.getValue('last_redirect_url')
      }
      this.close_tab(new_tab)

      if (!redirect_url) {
         console.log('timeout on user_concent')
      }
      return redirect_url
   }

   close_tab(tab) {
      if ('closeTab' in GM)
         GM.closeTab(tab.id)
      else
         tab.close()
   }
}

export class GToken {
   constructor(scopes) {
      this.cache = new GmCache({}, 'google_token')
      this.creds = JSON.parse(G_CREDS)
      this.cache_key = [this.creds.client_id, ...scopes, USER_MAIL].join('_')
      this.scopes = scopes
   }

   async get() {
      let token = await this.get_token()

      if (token && this.is_token_expired(token)) {
         token = await this.refresh_token(token)
      }
      if (!token) {
         let token_flow = new TokenFlow(this.creds, this.scopes)
         token = await token_flow.get()
         await this.save_token(token)
      }
      return token?.access_token
   }

   async save_token(token) {
      if (!token) return
      token.expires_at = Date.now() + token.expires_in * 1000
      this.cache[this.cache_key] = token
      await this.cache.save()
   }

   async get_token() {
      await this.cache.get_init_awaiter()
      // this.cache[this.cache_key].expires_at = Date.now() - 1
      // return null
      return this.cache[this.cache_key]
   }

   is_token_expired(token) {
      return Date.now() > token.expires_at
   }

   async refresh_token(old_token) {
      let params = {
         client_id: this.creds.client_id,
         client_secret: this.creds.client_secret,
         grant_type: 'refresh_token',
         refresh_token: old_token.refresh_token,
      }
      let data = new URLSearchParams(params).toString() + '&'

      let [token, _] = await fetchGM(
         this.creds.token_uri,
         { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
         "POST",
         data,
      )
      await this.save_token(token)

      if (!token) {
         console.log("refresh token expired")
      }
      return token
   }
}