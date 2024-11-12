//import { bench, describe, beforeAll, beforeEach, afterEach, suite  } from 'vitest'
import { beforeEach } from "vitest";
import * as funcParser from "../src/parser/ParserFunctionInjector"
import { Bench, Task } from 'tinybench'

let validInputGenerator = () => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  
  let result = '|'
    + uppercase.charAt(Math.floor(Math.random() * uppercase.length))
    + lowercase.charAt(Math.floor(Math.random() * lowercase.length))
    + "|";

  let counter = 0;
  let triggerPipe = false;
  let lengthOfPkgId = Math.floor(Math.random() * 4) + 1;
  let lengthOfPkgSize = Math.floor(Math.random() * 8) + 1;
  let randomExtra = Math.floor(Math.random() * 70) + 5;
  while (counter < lengthOfPkgId + lengthOfPkgId + randomExtra + 2) {
    if(triggerPipe){
      result += "|";
      triggerPipe = false;
    }else if(counter > lengthOfPkgId + lengthOfPkgId + 2){
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }else{
      result += numbers.charAt(Math.floor(Math.random() * numbers.length));
      if(lengthOfPkgId === counter || lengthOfPkgSize + lengthOfPkgId + 1 === counter){
        triggerPipe = true;
      }
    }
    counter += 1;
  }
  return result;

}



var testValue=validInputGenerator();
const bench = new Bench({});
await funcParser.WasmParser.instance.init();
bench
  .add('js', () => {
    var val=Uint8Array.from(testValue.split('').map((c:string) => c.charCodeAt(0)))
    funcParser.JsParser.instance.delimitPipe(val);
  })

  .add('wasm', () => {
    var val=Uint8Array.from(testValue.split('').map((c:string) => c.charCodeAt(0)))
    funcParser.WasmParser.instance.delimitPipe(val);
  })

bench.addEventListener("start", (e) => {
  testValue=validInputGenerator();
});
  
bench.addEventListener("cycle", (e) => {
  testValue=validInputGenerator();
});

// const beforeEachTask = new Task(bench, "beforeEachTask", {
//     beforeEach: () => {
      
//     }
//   });
await bench.run();

console.table(bench.table());