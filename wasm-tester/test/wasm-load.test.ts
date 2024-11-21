// sum.test.js
import {  test,  expectTypeOf, expect } from 'vitest'
import * as funcParser from "../src/parser/ParserFunctionInjector"



//import Module from '../src/Das2Wasm.mjs';

test('Test setting up module for general use', async () => {
  //var instance = await Module();
  var instance = funcParser.WasmParser.instance
  await instance.init();
  expectTypeOf(instance).toMatchTypeOf<funcParser.FunctionFactory>();
  var testString = "|Hx|10|1584|fkdslfjsdlfjsdljjljsdfljsd";
  var val=Uint8Array.from(testString.split('').map((c:string) => c.charCodeAt(0)))

  let result = instance.delimitPipe(val);
  expectTypeOf(result).toMatchTypeOf<{
      pkgSize: number;
      pkgType: string; 
      nextIdx: number; 
      pkgId:  string;
  }>();
  expect(result.pkgType).toBe("Hx");
  expect(result.pkgSize).toBe(1584);
  expect(result.pkgId).toBe("10");

})

test('Test parsing of an xml header strea' , async () => {
  var instance = funcParser.WasmParser.instance
  await instance.init();
  
})
