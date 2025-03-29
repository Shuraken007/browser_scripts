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

export const types = {
   Dict: 'Dict',
   Array: 'Array',
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

export function rnd_key_from_obj(obj) {
   return rnd_from_arr(Object.keys(obj))
}

export function toArr(item) {
   if (get_type(item) !== types.Array)
      item = [item]
   return item
}

export function get_pct_diff(v1, v2) {
   let max = Math.max(v1, v2)
   let diff = Math.abs(v1 - v2)
   return diff / max * 100

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

// for (const [key, node] of recurIter(json)) {...}
// export function* recurIter(data, ignore_keys_arr = [], ignore_node_filter = null, cur_key = "entry_point") {
//    // let type = get_type(data)
//    if (data instanceof Array) {
//       // if (type === types.Array) {
//       for (const node of data) {
//          yield* recurIter(node, ignore_keys_arr, ignore_node_filter, cur_key)
//       }
//    } else if (typeof data == 'object') {
//       if (ignore_node_filter && ignore_node_filter(data, cur_key))
//          return
//       yield [cur_key, data]
//       for (const [k, node] of Object.entries(data)) {
//          if (ignore_keys_arr.includes(k)) continue
//          yield* recurIter(node, ignore_keys_arr, ignore_node_filter, k)
//       }
//    } else {
//       return
//    }
// }