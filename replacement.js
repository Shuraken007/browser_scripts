// ==UserScript==
// @name         Replacer
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  replace words
// @author       Shuraken007
// @include https://*/*
// @include http://*/*
// @require https://raw.githubusercontent.com/Shuraken007/browser_scripts/refs/heads/main/replace_words.js
// @require https://code.jquery.com/jquery-3.6.0.min.js
// @grant        none
// ==/UserScript==
load_config("https://api.npoint.io/ecef5ef17a23b6bd2222")
addEventListener("load", main)