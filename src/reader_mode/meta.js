// ==UserScript==
// @name         Reader Mode
// @namespace    http://tampermonkey.net/
// @version      0.1
// @license MIT
// @description  converting site to readable mode, must configure manually with dev tools
// @author       Shuraken007

INCLUDE_HTTP
// @run-at        document-start
// @grant          unsafeWindow

// ==/UserScript==

/* jshint esversion: 9 */
{
   const CONFIG_URL = "READER_MODE_CONFIG_URL";

   const GIST_CONFIG = {
      token: "GIST_TOKEN",
      id: "GIST_ID",
      file: "GIST_FILE"
   };

   SCRIPT_BODY
};