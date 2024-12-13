// ==UserScript==
// @name         Replacer
// @namespace    http://tampermonkey.net/
// @version      1.1
// @license MIT
// @description  replace words
// @author       Shuraken007
// @include https://*/*
// @include http://*/*
// ==/UserScript==

/* jshint esversion: 8 */

load_config("https://api.npoint.io/52eec657d69aa53f658a")
addEventListener("load", main);

var replacements = null;
var config_data = null;
const observer = new MutationObserver(run_mutations);
const timer = ms => new Promise(res => setTimeout(res, ms));

async function main() {
   'use strict';
   'esversion: 8';

   var counter = 0;
   while (!replacements) {
      await timer(200);
      counter++;
      if (counter > 10) {
         throw new Error("config with replacements not loaded");
      }
   }
   console.log("config loaded!");
   if (replacements.length == 0) {
      console.log("no replacements for this site!");
      return;
   }

   observer.observe(document.body, { childList: true, subtree: true });
   replaceText(document.body);
}

async function load_config(link) {
   var restored_config_as_str = await localStorage.getItem("replacement_json_config");
   var restored_config_as_json = null;
   if (restored_config_as_str) {
      build_suited_config(restored_config_as_str, null, true);
   }
   fetch(link)
      .then(response => response.text())
      .then(str => build_suited_config(str, restored_config_as_str))
      .catch(err => console.log(err));
}

function build_suited_config(data, restored_data = null, is_fast_load = false) {
   if (!is_fast_load && restored_data && data === restored_data) {
      return;
   }

   var data_as_json = JSON.parse(data);
   var cur_url = window.location.href;
   var new_replacements = [];
   for (const [k, v] of Object.entries(data_as_json)) {
      let url_token = tokenToRegex(k, true);
      url_token = new RegExp(url_token);
      if (!url_token.test(cur_url)) {
         continue;
      }

      for (let i = 0; i < v.length; i += 2) {
         let regex = tokenToRegex(v[i]);
         let replacement = tokenToRegex(v[i + 1]);

         new_replacements.push(regex);
         new_replacements.push(replacement);
      }
   }
   replacements = new_replacements;
   config_data = data;
   //console.log(replacements)
   if (!is_fast_load) {
      localStorage.setItem("replacement_json_config", data);
      console.log('config updated');
      replaceText(document.body);
   }
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
         let new_text = make_replacements(text);
         if (text != new_text) { node.textContent = new_text; }
         break;
      }
      case Node.DOCUMENT_NODE:
         node.childNodes.forEach(replaceText);
   }
}

function make_replacements(text) {
   for (let i = 0; i < replacements.length; i += 2) {
      let regex = replacements[i];
      let replacement = replacements[i + 1];
      text = text.replaceAll(regex, replacement);
   }
   return text;
}

// prepareRegex by JoeSimmons
// used to take a string and ready it for use in new RegExp()
function prepareRegex(string) {
   // escape: []^&$.()?/\+{}|
   string = string.replace(/([\[\]\^\&\$\.\(\)\?\/\\\+\{\}\|])/g, '\\$1');
   // '*' -> '[^ ]*', but '\*' -> '*'
   string = string.replace(/\\?\*/g, function (fullMatch) {
      return fullMatch === '\\*' ? '*' : '[^ ]*';
   });
   return string;
}

function getRegFromString(string) {
   var a = string.split("/");
   let modifiers = a.pop();
   a.shift();
   let pattern = a.join("/");
   if (!modifiers.includes('g')) {
      modifiers += 'g';
   }
   // console.log(`pattern: ${pattern}, modifiers: ${modifiers}`)
   return new RegExp(pattern, modifiers);
}

var rIsRegexp = /^\/(.+)\/([gim]+)?$/;
function tokenToRegex(string, is_prepared = false) {
   if (string.match(rIsRegexp)) {
      // console.log(`user_regexp: ${string}`)
      return getRegFromString(string);
   }
   if (is_prepared) {
      string = prepareRegex(string);
      return new RegExp(string);
   }
   return string;
}