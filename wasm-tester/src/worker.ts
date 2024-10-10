import * as funcParser from "./parser/ParserFunctionInjector"
// worker.ts
self.onmessage = (e) => {
    let val=Uint8Array.from(e.data.split('').map((c:string) => c.charCodeAt(0)))
    self.postMessage(funcParser.JsParser.instance.delimitPipe(val))
}
self.onerror = (e)=>{
    console.error(e);
    self.postMessage({error: e});
}
