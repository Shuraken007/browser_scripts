function search_deep(obj, searching_field, viewed = new Map(), cur_path = [], result = []) {
   if (!obj) return
   if (viewed.has(obj)) return

   if (typeof obj === 'string' && (obj === searching_field || obj.includes(searching_field))) {
      result.push([...cur_path, obj])
      return
   }

   viewed.set(obj, true)
   if (obj instanceof Array) {
      obj.forEach((x, i) => search_deep(x, searching_field, viewed, [...cur_path, obj, i], result))
   } else if (typeof obj == 'object') {
      if (obj[searching_field] && typeof obj[searching_field] === 'function') {
         result.push([...cur_path, obj])
      }
      for (let [key, value] of Object.entries(obj)) {
         if (typeof key === 'string' && (key === searching_field || key.includes(searching_field))) {
            result.push([...cur_path, obj, key])
         }
         search_deep(value, searching_field, viewed, [...cur_path, obj, key], result)
      }
   }
   return result
}

function search_method(obj, method_name, viewed = new Map(), depth = 0, cur_path = [], result = []) {
   if (!obj) return
   if (viewed.has(obj)) return

   viewed.set(obj, true)

   if (obj instanceof Array) {
      obj.forEach(x => search_method(x, method_name, viewed, depth + 1, [...cur_path, obj], result))
   } else if (typeof obj == 'object') {
      if (obj[method_name] && typeof obj[method_name] === 'function') {
         result.push(obj)
         console.log(cur_path)
      }
      for (let value of Object.values(obj)) {
         search_method(value, method_name, viewed, depth + 1, [...cur_path, obj], result)
      }
   }
   return result
}
