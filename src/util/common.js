export function escapeRegexChars(string) {
   // escape: []{}()^$&|.?+*/\
   return string.replace(/([\[\]\{\}\(\)\^\$\&\|\.\?\+\*\/\\])/g, '\\$1');
}

export function getRegFromString(string, is_global_required) {
   var a = string.split("/");
   let modifiers = a.pop();
   a.shift();
   let pattern = a.join("/");
   if (is_global_required && !modifiers.includes('g')) {
      modifiers += 'g';
   }
   return new RegExp(pattern, modifiers);
}

const rIsRegexp = /^\/(.+)\/(\w+)?$/;

export function urlToRegex(url) {
   if (url.match(rIsRegexp))
      return getRegFromString(url, true);

   url = url.replaceAll("\\*", "__ALREADY_ESCAPED_STAR__")
   url = escapeRegexChars(url)
   // expand * -> [^ ]*
   url = url.replaceAll("\\*", '[^ ]*')
   url = url.replaceAll("__ALREADY_ESCAPED_STAR__", '\\*')
   return new RegExp(url)
}

export function tokenToRegex(string) {
   if (string.match(rIsRegexp))
      return getRegFromString(string, true);

   return string;
}

export async function delay(ms) {
   return new Promise(resolve => setTimeout(resolve, ms))
}

export async function load(url) {
   let response;
   try {
      response = await fetch(url);
   } catch (err) {
      throw Error(
         `loading: ${url}f
          err: ${err}`);
   }
   if (response.status == 200) {
      return response.text();
   } else {
      throw Error(
         `loading: ${url}
            status: ${response.status}
            response: ${response.response}
            `);
   }
}

function parse_headers(headers_str) {
   let headers = {}
   let headers_arr = headers_str.split("\n")
   for (let line of headers_arr) {
      const [k, v] = line.split(":").map((x) => x.trim());
      if (!(k && v)) continue
      headers[k] = v
   }
   return headers
}

// try to parse reponse as JSON
// if error in json - return null body and error
function parse_body(body, is_response_ok) {
   try {
      let json_body = JSON.parse(body)
      if (is_response_ok)
         return [json_body, null]

      let json_err = null
      for (let k of Object.keys(json_body)) {
         if (!k.includes('err')) continue
         json_err = json_body[k]
         break
      }
      return [json_body, json_err]
   } catch (err) {
      return [body, null]
   }
}

function fetch_on_load(response, resolve) {
   let is_response_ok = response.status >= 200 && response.status < 300
   let [json_body, json_err] = parse_body(response.response, is_response_ok)

   let body = is_response_ok ? json_body : null
   resolve(
      [
         body,
         {
            body: json_body,
            json_err: json_err,
            headers: parse_headers(response.responseHeaders),
            status: response.status,
            status_text: response.statusText,
         }
      ]
   );
}

export async function fetchGM(url, headers = {}, method = "GET", data = null, timeout = 10 * 1000) {
   return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
         method,
         url: url,
         headers,
         data: data,
         timeout,
         // withCredentials: true,
         onload(response) {
            fetch_on_load(response, resolve)
         },
         onabort() {
            reject(new DOMException(`Aborted ${url}`, "AbortError"))
         },
         ontimeout() {
            reject(new TypeError(
               `timeout after ${timeout}
               on ${url}`))
         },
         onerror(err) {
            reject(new TypeError(
               `Failed to fetch: ${url}
               err: ${err}`))
         },
      })
   })
}

export async function xmlHttpRequestGet(url, headers = { 'Content-Type': 'text/css' }) {
   return new Promise((resolve, reject) => {
      GM.xmlHttpRequest({
         method: 'GET',
         url: url,
         responseType: 'text',
         headers: headers,
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

export async function xmlHttpRequestPost(url, data, headers = { 'Content-Type': 'application/x-www-form-urlencoded' }) {
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

export async function xml_fetch(url) {
   let response;
   try {
      response = await xmlHttpRequestGet(url);
   } catch (err) {
      throw Error(
         `loading: ${url}f
          err: ${err}`);
   }
   if (response.status == 200) {
      return response.responseText;
   } else if (response.status === 429) {
      return response
   }
   else {
      throw Error(
         `loading: ${url}
            status: ${response.status}
            response: ${response.response}
            `);
   }
}

// load with retry on 429 status
export async function xml_fetch_with_retry(url, max_retries = 10, retries_delta_ms = 5000) {
   let res = await xml_fetch(url);
   let i = 0
   while (i < max_retries && res.status && res.status === 429) {
      await delay(retries_delta_ms);
      res = await xml_fetch(url);
      i++
   }
   return res
}

export const types = {
   Dict: 'Dict',
   Array: 'Array',
   RegExp: 'RegExp',
   String: 'String',
   Int: 'Int',
   Url: 'Url',
   Image: 'Image',
   Null: 'Null',
   Unknown: 'Unknown',
};

export function get_type(x) {
   if (x === null || typeof x === 'undefined') return types.Null;
   if (x instanceof Array) return types.Array;
   if (x instanceof Image) return types.Image;
   if (x instanceof RegExp) return types.RegExp;
   if (typeof x == 'object') return types.Dict;
   if (typeof x === 'string' || x instanceof String) {
      if (x.startsWith("http"))
         return types.Url
      return types.String;
   }
   if (!Number.isNaN(x) && Number.isInteger(x)) return types.Int;

   return types.Unknown;
}

export function isDict(x) {
   return get_type(x) === types.Dict
}
export function isArray(x) {
   return get_type(x) === types.Array
}
export function isString(x) {
   return get_type(x) === types.String
}
export function isInt(x) {
   return get_type(x) === types.Int
}
export function isUrl(x) {
   return get_type(x) === types.Url
}
export function isImage(x) {
   return get_type(x) === types.Image
}
export function isNull(x) {
   return get_type(x) === types.Null
}
export function isUnknown(x) {
   return get_type(x) === types.Unknown
}
function isObjEmpty(obj) {
   for (var i in obj) return false;
   return true;
}
export function isEmpty(x) {
   return isDict(x) && isObjEmpty(x)
      || isArray(x) && x.length === 0
      || isString(x) && x === ""
      || isInt(x) && x === 0
}

export function rnd_from_arr(arr) {
   return arr[arr.length * Math.random() << 0]
}

export function rnd_idx_from_arr(arr) {
   return arr.length * Math.random() << 0
}

export function rnd_key_from_obj(obj) {
   return rnd_from_arr(Object.keys(obj))
}

export function rnd_obj_by_amount(arr, get_amount_call) {
   let amounts = arr.map(item => get_amount_call(item))
   let total_amount = amounts.reduce((a, b) => a + b, 0)
   let rnd = Math.random() * total_amount
   let cum_amount = 0

   for (let i = 0; i < arr.length; i++) {
      cum_amount += amounts[i]
      if (rnd <= cum_amount)
         return arr[i]
   }
}

export function toArr(item) {
   if (get_type(item) !== types.Array)
      item = [item]
   return item
}


export function obj_true_length(obj) {
   return Object.values(obj).filter(v => v == true).length
}

// merge object from -> object to
export function merge_obj(to, from, ignore_keys = []) {
   if (isNull(to)) {
      throw new TypeError(`to is null`);
   } else if (isArray(to)) {
      to.push(...from);
      return to;
   }
   for (const key in from) {
      if (!from.hasOwnProperty(key)) continue;
      if (isDict(to[key]) && isDict(from[key]) && !ignore_keys.includes(key)) {
         merge_obj(to[key], from[key], ignore_keys);
         continue;
      } else if (isArray(to[key]) && isArray(from[key])) {
         to[key] = to[key].concat(from[key]);
         continue;
      }
      to[key] = from[key];
   }

   return to;
}

export function are_obj_equal(a, b) {
   let res = true
   if (get_type(a) !== get_type(b))
      return false
   if (!isDict(a) || !isArray(b))
      return a === b
   if (isDict(a)) {
      for (let k of Object.keys(a)) {
         if (!are_obj_equal(a[k], b[k]))
            return false
      }
      for (let [k, v] of Object.keys(b)) {
         if (!are_obj_equal(a[k], b[k]))
            return false
      }
   }
   if (isArray(a)) {
      if (a.length !== b.length) return false
      for (let i = 0; i < a.length; i++)
         if (!are_obj_equal(a[i], b[i]))
            return false
   }
   return true
}

export function get_key_by_val(object, value) {
   return Object.keys(object).find(key => object[key] === value);
}