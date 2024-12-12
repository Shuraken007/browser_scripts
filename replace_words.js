var json_config = null
const observer = new MutationObserver(run_mutations);

async function main() {
   'use strict';

   var counter = 0;
   while (!json_config) {
      await new Promise(r => setTimeout(r, 200));
      counter++;
      console.log('waiting')
      if (counter > 10) {
         throw new Error("config with replacements not loaded");
      }
   }

   console.log("config loaded!");
   observer.observe(document.body, { childList: true, subtree: true });
   replaceText(document.body);
   // Your code here...
};

function load_config(link) {
   $.getJSON(link)
      .done(build_suited_config);
}

function build_suited_config(data) {
   // console.log(data);
   var cur_url = window.location.href;
   json_config = new Map();
   for (const [k, v] of Object.entries(data)) {
      url_token = tokenToRegex(k)
      if (!url_token.test(cur_url)) {
         continue
      }
      for (const [token, replacement] of Object.entries(v)) {
         regex = tokenToRegex(token)
         // console.log(typeof (regex))
         json_config.set(tokenToRegex(token), replacement)
      }
   }
   console.log(json_config)
}

function run_mutations(mutations) {
   mutations.forEach(mutation => {
      if (mutation.type === "childList") {
         mutation.addedNodes.forEach(node => {
            replaceText(node);
         });
      }
   });
}

const replacements = new Map([
   ['习近平', '村长'],
   ['关键词1', '替换1'],
   ['关键词2', '替换2'],
]);

function replaceText(node) {
   switch (node.nodeType) {
      case Node.ELEMENT_NODE:
         node.childNodes.forEach(replaceText);
         break;
      case Node.TEXT_NODE: {
         let text = node.textContent;
         if (!text) { break; }
         // console.log(node.nodeType, node.nodeValue)
         node.textContent = make_replacements(text);
         break;
      }
      case Node.DOCUMENT_NODE:
         node.childNodes.forEach(replaceText);
   }
}

function make_replacements(text) {
   for (const [regex, replacement] of json_config.entries()) {
      // if (text.includes("Су Сяо")) {
      //    console.log(typeof (regex), replacement)
      // }
      text = text.replace(regex, replacement);
   }
   return text
}

// prepareRegex by JoeSimmons
// used to take a string and ready it for use in new RegExp()
function prepareRegex(string) {
   string = string.replace(/([\[\]\^\&\$\.\(\)\?\/\\\+\{\}\|])/g, '\\$1');
   string = string.replace(/\\?\*/g, function (fullMatch) {
      return fullMatch === '\\*' ? '*' : '[^ ]*';
   })
   return string
}

function getRegFromString(string) {
   var a = string.split("/");
   modifiers = a.pop(); a.shift();
   pattern = a.join("/");
   if (!modifiers.includes('g')) {
      modifiers += 'g'
   }
   // console.log(`pattern: ${pattern}, modifiers: ${modifiers}`)
   return new RegExp(pattern, modifiers);
}

var rIsRegexp = /^\/(.+)\/([gim]+)?$/;
function tokenToRegex(string) {
   if (string.match(rIsRegexp)) {
      // console.log(`user_regexp: ${string}`)
      return getRegFromString(string)
   }
   str_as_regex = prepareRegex(string)
   // console.log(`pattern: ${str_as_regex}`)
   return new RegExp(str_as_regex, 'g')
}