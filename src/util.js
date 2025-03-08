export function escapeRegexChars(string) {
   // escape: []{}()^$&|.?+*/\
   return string.replace(/([\[\]\{\}\(\)\^\$\&\|\.\?\+\*\/\\])/g, '\\$1');
}

export function escapeUrlRegexChars(url) {
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
   Array: 'Array',
   Dict: 'Dict',
   String: 'String',
   Int: 'Int',
   Unknown: 'Unknown',
};

export function get_type(x) {
   if (x instanceof Array) return types.Array;
   if (typeof x == 'object') return types.Dict;
   if (typeof x === 'string' || x instanceof String) return types.String;
   if (!Number.isNaN(x) && Number.isInteger(x)) return types.Int;

   return types.Unknown;
}

export function rnd_from_arr(arr) {
   return arr[arr.length * Math.random() << 0]
}

export function toArr(item) {
   if (get_type(item) !== types.Array)
      item = [item]
   return item
}

// for (const [key, node] of recurIter(json)) {...}
export function* recurIter(data, ignore_keys_arr = [], ignore_node_filter = null, cur_key = "entry_point") {
   // let type = get_type(data)
   if (data instanceof Array) {
      // if (type === types.Array) {
      for (const node of data) {
         yield* recurIter(node, ignore_keys_arr, ignore_node_filter, cur_key)
      }
   } else if (typeof data == 'object') {
      if (ignore_node_filter && ignore_node_filter(data, cur_key))
         return
      yield [cur_key, data]
      for (const [k, node] of Object.entries(data)) {
         if (ignore_keys_arr.includes(k)) continue
         yield* recurIter(node, ignore_keys_arr, ignore_node_filter, k)
      }
   } else {
      return
   }
}

// function* recurIter(data, depth = 1) {
//    for (const node of data) {
//       // Create a new object that includes the depth property
//       const { children, ...rest } = { ...node, depth };
//       if (children) yield* recurIter(children, depth + 1);
//       yield rest;
//    }
// }

// // Demo with your example data
// const data = [{ key: 1, path: '/users', name: 'users', children: [{ key: 2, path: '/users/roles', name: 'roles' }, { key: 3, path: '/users/permissions', name: 'permissions' }] }, { key: 4, path: '/projects', name: 'projects', children: [{ key: 5, path: '/projects/milestones', name: 'milestones', children: [{ key: 6, path: '/projects/milestones/tasks', name: 'tasks' }] }] }];

// for (const { name, depth } of recurIter(data)) {
//    console.log(`Yield route: depth=${depth} name="${name}"`);
// }