import jQuery from 'jquery';

const $ = jQuery.noConflict(true);

function split_with_delim(str, delim, delim_as) {
   if (!delim_as) {
      delim_as = delim
   }
   let arr = str.split(delim)
   if (arr.length == 1) return arr
   let new_arr = []
   for (let i = 0; i < arr.length; i++) {
      let item = arr[i]
      if (item !== '')
         new_arr.push(item)
      if (i != arr.length - 1)
         new_arr.push(delim_as)
   }
   return new_arr
}

// allow to store parent calls in string $(".btn").parent() -> $(".btn:parent()")
const extended_calls = ["parent"]
export function jq(query) {
   let splited = [query]
   for (const e_call of extended_calls) {
      let new_splited = []
      for (let i = 0; i < splited.length; i++) {
         let arr = split_with_delim(splited[i], `:${e_call}()`, e_call)
         new_splited = new_splited.concat(arr)
      }
      splited = new_splited
   }
   let x = $(splited[0])
   splited.slice(1).forEach(function (q) {
      if (extended_calls.includes(q)) {
         x = x[q]()
      }
   });
   return x
}

export function get_elements_by_query_arr(query_arr = []) {
   let elems = []
   for (let query of query_arr) {
      elems = elems.concat(jq(query).get())
   }
   return elems
}