// ==UserScript==
// @run-at        document-start
INCLUDE_HTTP
// @name         Reader Mode
// @namespace    http://tampermonkey.net/
// @version      0.1
// @license MIT
// @description  converting site to readable mode, must configure manually with dev tools
// @author       Shuraken007
// ==/UserScript==

/* jshint esversion: 9 */
{
   const CONFIG_URL = "READER_MODE_CONFIG_URL";

   const TG_CONFIG = { token: "TELEGRAM_TOKEN", chat_id: "TELEGRAM_CHAT_ID" };

   SCRIPT_BODY
};