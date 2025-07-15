// ==UserScript==
// @name         AD save fixer
// @version      0.1
// @license MIT
// @description  fix click area for button 'Import save from file'
// @author       Shuraken007

// @include https://ivark.github.io/AntimatterDimensions/

// ==/UserScript==
{
   function get_rule(selector) {
      for (let sheet of [...document.styleSheets].reverse()) {
         try { sheet.cssRules } catch (err) { continue }
         for (let sheetRule of [...sheet.cssRules]) {
            if (!sheetRule.selectorText) continue
            if (sheetRule.selectorText !== selector) continue
            return sheetRule
         }
      }
   }

   function main() {
      let selector = '.c-file-import::before'
      let rule = get_rule(selector)
      if (!rule) {
         console.log(`rule not found by selector: "${selector}"`)
         return
      }
      rule.style.cssText = rule.style.cssText.replaceAll(/\d+rem/g, "0rem")
   }

   main()
};