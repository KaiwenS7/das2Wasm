// worker.test.ts
import '@vitest/web-worker'
import {  test,  expectTypeOf, expect } from 'vitest'

test('worker', async () => {
    
    // new Worker is also supported
    let worker = new Worker(new URL('../src/worker.ts', import.meta.url))
    var promiseResolve, promiseReject;

    var promise = new Promise(function(resolve, reject){
        promiseResolve = resolve;
        promiseReject = reject;
    });

    worker.postMessage("|Hx|10|1584|fkdslfjsdlfjsdljjljsdfljsd")
    worker.onmessage = (e) => {
        // e.data equals to 'hello world'
        expectTypeOf(e.data).toMatchTypeOf<{
            pkgSize: number;
            pkgType: string; 
            nextIdx: number; 
            pkgId:  string;
        }>();
        try {
            expect(e.data.pkgId).toBe("10")
            expect(e.data.pkgType).toBe("Hx")
            expect(e.data.pkgSize).toBe(1584)
            expect(e.data.nextIdx).toBe(12)
            promiseResolve();
        } catch (error) {
            promiseReject(error);    
        }
    }
    worker.onerror = (e) => {
        promiseReject(e);
    }
    
    await promise;
    

})