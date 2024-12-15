// ==UserScript==
// @name         Replacer
// @namespace    http://tampermonkey.net/
// @version      1.4
// @license MIT
// @description  replace words
// @author       Shuraken007
// @include https://*/*
// @include http://*/*
// @downloadURL https://update.greasyfork.org/scripts/520584/Replacer.user.js
// @updateURL https://update.greasyfork.org/scripts/520584/Replacer.meta.js
// ==/UserScript==

/* jshint esversion: 8 */

load_config("https://api.npoint.io/97ef86b1e99dfc26c72d");

const timer = ms => new Promise(res => setTimeout(res, ms));
var replacements = null;
const observer = new MutationObserver(run_mutations);

waitForKeyElements("body", main, true);
// addEventListener("load", main);

async function main() {
   'use strict';
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
   var restored_config_as_str = await localStorage.getItem("saved_replacement_config");
   if (restored_config_as_str) {
      build_suited_config(restored_config_as_str, null, true);
   }
   fetch(link)
      .then(response => response.text())
      .then(str => build_suited_config(str, restored_config_as_str, false))
      .catch(err => console.log(err));
}

function build_suited_config(data, restored_data = null, is_fast_load = false) {
   if (!is_fast_load && restored_data && data === restored_data) {
      return;
   }

   var data_as_json = JSON.parse(data);
   var cur_url = window.location.href;
   var new_replacements = [];
   for (const [url_key, replacements_config] of Object.entries(data_as_json)) {
      let url_token = tokenToRegex(url_key, true);
      url_token = new RegExp(url_token);
      if (!url_token.test(cur_url)) {
         continue;
      }

      for (let i = 0; i < replacements_config.length; i += 2) {
         let regex = tokenToRegex(replacements_config[i]);
         let replacement = replacements_config[i + 1];

         new_replacements.push(regex);
         new_replacements.push(replacement);
      }
   }
   replacements = new_replacements;
   if (!is_fast_load) {
      localStorage.setItem("saved_replacement_config", data);
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

function get_random(list) {
   return list[Math.floor((Math.random() * list.length))];
}

function make_replacements(text) {
   for (let i = 0; i < replacements.length; i += 2) {
      let regex = replacements[i];
      let replacement = replacements[i + 1];
      if (replacement instanceof Array) {
         replacement = get_random(replacement);
      }
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

// https://raw.githubusercontent.com/CoeJoder/waitForKeyElements.js/refs/heads/master/waitForKeyElements.js

function waitForKeyElements(selectorOrFunction, callback, waitOnce, interval, maxIntervals) {
   if (typeof waitOnce === "undefined") {
      waitOnce = true;
   }
   if (typeof interval === "undefined") {
      interval = 300;
   }
   if (typeof maxIntervals === "undefined") {
      maxIntervals = -1;
   }
   if (typeof waitForKeyElements.namespace === "undefined") {
      waitForKeyElements.namespace = Date.now().toString();
   }
   var targetNodes = (typeof selectorOrFunction === "function")
      ? selectorOrFunction()
      : document.querySelectorAll(selectorOrFunction);

   var targetsFound = targetNodes && targetNodes.length > 0;
   if (targetsFound) {
      targetNodes.forEach(async function (targetNode) {
         var attrAlreadyFound = `data-userscript-${waitForKeyElements.namespace}-alreadyFound`;
         var alreadyFound = targetNode.getAttribute(attrAlreadyFound) || false;
         if (!alreadyFound) {
            var cancelFound = await callback(targetNode);
            if (cancelFound) {
               targetsFound = false;
            }
            else {
               targetNode.setAttribute(attrAlreadyFound, true);
            }
         }
      });
   }

   if (maxIntervals !== 0 && !(targetsFound && waitOnce)) {
      maxIntervals -= 1;
      setTimeout(function () {
         waitForKeyElements(selectorOrFunction, callback, waitOnce, interval, maxIntervals);
      }, interval);
   }
}