// ==UserScript==
// @name         Wallpaper
// @namespace    http://tampermonkey.net/
// @version      0.1
// @license MIT
// @description  support random wallpapers for sites
// @author       Shuraken007

// @connect https://oauth2.googleapis.com
// @connect https://oauth2.googleapis.com/token
// @connect https://www.googleapis.com
// @connect https://wallhaven.cc/api/v1

// @include https://accounts.google.com/*signin*

BOOK_INCLUDE_HTTP

// @grant GM.getValue
// @grant GM.setValue
// @grant GM.deleteValue
// @grant GM.xmlHttpRequest
// @grant GM.openInTab
// @grant GM.closeTab

// @run-at        document-start

// ==/UserScript==

/* jshint esversion: 9 */
{
   const CONFIG_URL = "WALLPAPER_CONFIG_URL";
   const W_TOKEN = "WALLHAVEN_TOKEN";
   const G_CREDS = "GOOGLE_CLIENT_SECRETS";
   const G_SYNC_FOLDER = "GOOGLE_SYNC_FOLDER";
   const USER_MAIL = "TEST_USER_GMAIL";

   SCRIPT_BODY
};