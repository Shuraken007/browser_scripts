var replacements = null
const observer = new MutationObserver(run_mutations);

async function main() {
   'use strict';

   var counter = 0;
   while (!replacements) {
      await new Promise(r => setTimeout(r, 200));
      counter++;
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
   replacements = [];
   for (const [k, v] of Object.entries(data)) {
      url_token = tokenToRegex(k, true)
      url_token = new RegExp(url_token)
      if (!url_token.test(cur_url)) {
         continue
      }

      for (let i = 0; i < v.length; i += 2) {
         regex = tokenToRegex(v[i])
         replacement = tokenToRegex(v[i + 1])

         replacements.push(regex)
         replacements.push(replacement)
      }
   }
   console.log(replacements)
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
   for (let i = 0; i < replacements.length; i += 2) {
      regex = replacements[i]
      replacement = replacements[i + 1]
      text = text.replaceAll(regex, replacement);
   }
   return text
}

// prepareRegex by JoeSimmons
// used to take a string and ready it for use in new RegExp()
function prepareRegex(string) {
   // escape: []^&$.()?/\+{}|
   string = string.replace(/([\[\]\^\&\$\.\(\)\?\/\\\+\{\}\|])/g, '\\$1');
   // '*' -> '[^ ]*', but '\*' -> '*'
   string = string.replace(/\\?\*/g, function (fullMatch) {
      return fullMatch === '\\*' ? '*' : '[^ ]*';
   })
   return string
}

function getRegFromString(string) {
   var a = string.split("/");
   modifiers = a.pop();
   a.shift();
   pattern = a.join("/");
   if (!modifiers.includes('g')) {
      modifiers += 'g'
   }
   // console.log(`pattern: ${pattern}, modifiers: ${modifiers}`)
   return new RegExp(pattern, modifiers);
}

var rIsRegexp = /^\/(.+)\/([gim]+)?$/;
function tokenToRegex(string, is_prepared = false) {
   if (string.match(rIsRegexp)) {
      // console.log(`user_regexp: ${string}`)
      return getRegFromString(string)
   }
   if (is_prepared) {
      string = prepareRegex(string);
      return new RegExp(string);
   }
   return string
}