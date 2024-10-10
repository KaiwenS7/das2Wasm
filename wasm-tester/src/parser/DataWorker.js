import DataParser from "../utilities/DataParser";
console.log("Web Worker Loaded")

function workOnData(e){    
        console.log("Data Received by worker")
        var dp = new DataParser(e.data.schema,e.data.xsdCoord, e.data.coordsys, e.data.staticKeys, e.data.streams);
        var it= (e.data.startingPckSize)? dp.byteParser(e.data.bitArray, e.data.step, e.data.startingPckSize): dp.byteParser(e.data.bitArray, e.data.step);
        var data = (e.data.currentData)? e.data.currentData : {};

        var val;
        while(true){
            try {
                val = it.next();
                if(val.done){
                    it = null;
                    break;
                }
                
                if(!data[val.value.currPacketId]){
                    data[val.value.currPacketId] = {};
                    for(let key of Object.keys(val.value.dataProps)){
                        data[val.value.currPacketId][key] = [];
                    }            
                }
                // Go through all values to update current data state
                for(let [key, value] of Object.entries(val.value.dataProps)){
                    if(dp.staticKeys[val.value.currPacketId].includes(key) && (!dp.staticKeys[val.value.currPacketId].includes(key) || data[val.value.currPacketId][key].length <= 0))
                        data[val.value.currPacketId][key] = value;
                        
                    else if(!dp.staticKeys[val.value.currPacketId].includes(key))
                        data[val.value.currPacketId][key] = data[val.value.currPacketId][key].concat(value);
                }
                
            } catch (error) {
                // Passes error to on-error handler for main thread
                throw error;
            }
        }
        if(val.value.remaining)
            /* eslint-disable-next-line no-restricted-globals */
            self.postMessage({
                fileData: data, ready: true, streams: dp.streams, step: val.value.step, 
                remaining: val.value.content, pckSize: val.value.remaining, staticKeys: dp.staticKeys
            });
        else
            /* eslint-disable-next-line no-restricted-globals */    
            self.postMessage({
                fileData: data, ready: true, streams: dp.streams, step: val.value.step, 
                staticKeys: dp.staticKeys
            });

}

/* eslint-disable-next-line no-restricted-globals */
self.onmessage = workOnData;
/* eslint-disable-next-line no-restricted-globals */
self.onerror = (e)=>{
    console.error(e);
    self.postMessage({error: e});
}
