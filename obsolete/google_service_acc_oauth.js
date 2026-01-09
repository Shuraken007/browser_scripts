const AUTH_URL = "https://www.googleapis.com/auth/"
const AUD_URL = "https://oauth2.googleapis.com/token"
const TOKEN_URL = "https://www.googleapis.com/oauth2/v3/token"

function str2ab(str) {
   const buf = new ArrayBuffer(str.length);
   const bufView = new Uint8Array(buf);
   for (let i = 0, strLen = str.length; i < strLen; i++) {
      bufView[i] = str.charCodeAt(i);
   }
   return buf;
}

function buffer_array_to_string(buf) {
   return [].reduce.call(
      new Uint8Array(buf), function (p, c) {
         return p + String.fromCharCode(c)
      }, ''
   )
}

class JsonWebToken {
   constructor() {
      this.pk_start = "-----BEGIN PRIVATE KEY-----";
      this.pk_end = "-----END PRIVATE KEY-----";

      this.header = null
      this.claim_set = null
      this.signature = null
   }

   async get(private_key_id, private_key, client_email, scopes) {
      let scopes_as_str = scopes.map(x => AUTH_URL + x).join(' ')

      this.header = this.build_header(private_key_id)
      this.claim_set = this.build_claim_set(client_email, scopes_as_str)
      this.signature = await this.build_signature(this.header, this.claim_set, private_key)

      return [this.header, this.claim_set, this.signature]
         .map(x => this.encode(x))
         .join('.')
   }

   encode(obj) {
      let s = obj
      if (typeof obj === 'object')
         s = JSON.stringify(obj)
      s = btoa(s)
      return s.replace(/\=/g, "")
         .replace(/\+/g, "-")
         .replace(/\//g, "_")
   }

   decode(s) {
      s.replace(/\=/g, "")
         .replace(/\+/g, "-")
         .replace(/\//g, "_")
      s = atob(s)
      return s
   }

   build_header(private_key_id) {
      return {
         "alg": "RS256",
         "typ": "JWT",
         "kid": private_key_id
      }
   }

   build_claim_set(client_email, scopes_as_str) {
      let start = ~~(Date.now() / 1000)
      return {
         "iss": client_email,
         "scope": scopes_as_str,
         "aud": AUD_URL,
         "iat": start,
         "exp": start + 59 * 60,
      }
   }

   async prepare_private_key(private_key) {

      const prep_private_key = private_key.trim().replace('\n', '')
      const key_content = prep_private_key.substring(
         this.pk_start.length,
         prep_private_key.length - this.pk_end.length - 1,
      );
      const binary_key = atob(key_content)
      const array_buffer_key = str2ab(binary_key);

      return await window.crypto.subtle.importKey(
         "pkcs8",
         array_buffer_key,
         {
            name: "RSASSA-PKCS1-v1_5",
            hash: "SHA-256",
         },
         true,
         ["sign"]
      );
   }

   async build_signature(header, claim_set, private_key) {
      let data = this.encode(header) + '.' + this.encode(claim_set)
      let raw_data = new TextEncoder().encode(data)
      let crypto_private_key = await this.prepare_private_key(private_key)
      let signature_buffer_array = await window.crypto.subtle.sign(
         "RSASSA-PKCS1-v1_5",
         crypto_private_key,
         raw_data
      )
      return buffer_array_to_string(signature_buffer_array)
   }
}

export class AuthToken {
   constructor(client_secrets_str, scopes) {
      this.cache = new GmCache({}, 'google_auth_cache')
      this.scopes = scopes
      this.client_secrets = JSON.parse(client_secrets_str)
   }

   async get() {
      let token = await this.get_from_cache() || await this.get_from_request()
      return token
   }

   async get_from_cache() {
      await this.cache.get_init_awaiter()

      let key = this.scopes.join('')
      if (!this.cache[key])
         return null
      let expiration_time = this.cache[key].exp
      if (Date.now() > expiration_time)
         return null
      return this.cache[key].token
   }

   save_to_cache(response) {
      let key = this.scopes.join('')
      this.cache[key] = {
         token: response.access_token,
         exp: Date.now() + response.expires_in * 1000
      }
      this.cache.save()
   }

   async request(post_data, jwt) {
      let response = null
      try {
         response = await xmlHttpRequestPost(TOKEN_URL, post_data)
      } catch (err) {
         console.log(`failed to send google auth post`)
         console.log(err)
         return
      }
      let response_as_json = JSON.parse(response.response)
      if (!response_as_json.access_token) {
         console.log(`error response on google auth post`)
         console.log('json web token details:')
         console.log({
            header: jwt.header,
            claim_set: jwt.claim_set,
            signature: jwt.signature,
         })
         console.log('response_data:')
         console.log(response_as_json)
      }
      return response_as_json
   }

   async get_from_request() {
      let jwt = new JsonWebToken()
      let jwt_str = await jwt.get(
         this.client_secrets.private_key_id,
         this.client_secrets.private_key,
         this.client_secrets.client_email,
         this.scopes,
      )
      let params = {
         grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
         assertion: jwt_str
      }
      let data = new URLSearchParams(params).toString()

      let response = await fetchGM(
         TOKEN_URL,
         { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
         "POST",
         data
      )
      if (!response || response.json_err) return null
      this.save_to_cache(response.body)

      return response.access_token
   }
}