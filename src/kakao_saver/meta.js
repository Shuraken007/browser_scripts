// ==UserScript==
// @run-at        document-start
// @include *
// @name         Reader Mode
// @namespace    http://tampermonkey.net/
// @version      0.1
// @license MIT
// @description  scrap text from kakao saver
// @author       Shuraken007
// ==/UserScript==

/* jshint esversion: 9 */
{
   const iframe = document.createElement('iframe');
   iframe.style.display = 'none';
   document.body.appendChild(iframe); // add element
   window.my_fetch = iframe.contentWindow.fetch;

   SCRIPT_BODY
};