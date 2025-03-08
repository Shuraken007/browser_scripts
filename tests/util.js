import * as util from "../src/util.js"
import * as assert from "assert"

describe("iter_run", () => {
   it("iter_run", () => {
      let x = { a: 1, b: 2, c: { d: 4, e: 5 }, e: { f: 6, g: 7 } }
      let y = []
      for (let [k, v] of util.recurIter(x)) {
         y.push(v)
         console.log(k)
         console.log(v)
      }
   });
});