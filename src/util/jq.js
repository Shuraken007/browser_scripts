const extended_selectors = ["parent", "contains"]
const reg_split = /^(.+?)(:(?:parent|contains).+)?$/
const reg_calls = /:(?<call>parent|contains)\(["']?(?<arg>.*?)["']?\)/g

// default query selector with extended calls, which added at the end of query:
// contains: `div:contains('some_text')`
// parent: `div:parent():parent()` - div.parentNode.parentNode

function jq_apply_call(nodes, call, arg) {
   if (call === 'parent') {
      let amount = parseInt(arg || '1', 10);
      for (let i = 0; i < amount; i++) {
         nodes = nodes.map(node => node.parentNode)
      }
   } else if (call === 'contains') {
      nodes = nodes.filter(node => node.textContent.includes(arg))
   }
   return nodes
}

export function jq(query) {
   let extended_calls_str = null
   if (extended_selectors.some(sel => query.includes(sel))) {
      let match = query.match(reg_split)
      query = match[1]
      extended_calls_str = match[2]
   }
   if (!query) {
      console.log(`can't split query ${query}`)
      return null
   }
   let nodes = [...document.querySelectorAll(query)]
   if (nodes.length === 0 || !extended_calls_str)
      return nodes

   for (let match of extended_calls_str.matchAll(reg_calls)) {
      let call = match.groups.call
      let arg = match.groups.arg
      nodes = jq_apply_call(nodes, call, arg)
   }
   return nodes
}

export function jqs(query_arr = []) {
   let nodes = []
   for (let query of query_arr) {
      nodes = nodes.concat(jq(query))
   }
   return nodes
}
