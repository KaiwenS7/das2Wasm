import SchemaParser from "./SchemaParser";
import { DOMParser } from '@xmldom/xmldom'
import * as FunctionInjector from "./ParserFunctionInjector";

function readFileAsync(file) {
    return new Promise((resolve, reject) => {
      let reader = new FileReader();
  
      reader.onload = () => {
        resolve(reader.result);
      };
  
      reader.onerror = reject;
  
      reader.readAsArrayBuffer(file);
    })
  }
  
class DataParser{

  constructor(schema, xsdCoord=true, coordsys={}, staticKeys={}, streams={}, streamHeader=null, funcInjection=FunctionInjector.JsParser, debug=false){
    this.schema = schema;
    this.streamHeader = streamHeader;
    this.coordsys = coordsys;
    this.staticKeys = staticKeys;
    this.streams = streams;
    this.dataHeaders = {}
    this.performanceStep = 0;
    this.performances = {};
    this.performanceTiggers = 0;
    this.debug = debug;
    this.xsdCoord = xsdCoord;
    this.delimitPipe = funcInjection.instance.delimitPipe;
  }

  getParserState(){
    return {schema: this.schema, xsdCoord: this.xsdCoord, coordsys: this.coordsys,
            staticKeys: this.staticKeys, streams: this.streams, streamHeader: this.streamHeader,

          }
  }

  recursiveBuild(schema, xml, packetId, debug=false){
    if(schema && xml){
      if(debug){
        console.log(`recursiveBuild Location: ${schema}`)
      }
      let idx = 0;
      let childNodes = xml.childNodes;
      for(let i = 0; i < childNodes.length; i++){
          let child = childNodes[i];
          try {
            if(debug){
              console.log(`recursiveBuild Location: ${child.tagName}`)
            }
            if(!child.tagName) continue;
            var childElement = SchemaParser.findElement(schema, child.tagName.toLowerCase())
            childElement = SchemaParser.fillElement(childElement, child)
            if(child.tagName.toLowerCase().includes("coord") || (child.tagName.toLowerCase() === "data")){
              // Extended to maintain different coordsys for each stream
              var currentName = null;
              let attributes = Object.values(child.attributes);
              attributes.forEach((x)=>{/[nN]ame/.test(x.name)? currentName = x.value:null})
              if(!this.coordsys[packetId][child.tagName.toLowerCase()]) this.coordsys[packetId][child.tagName.toLowerCase()] = {};
              this.coordsys[packetId][child.tagName.toLowerCase()][currentName]|=child.getElementsByTagName("vector").length > 0;
            }
            // Build out choice elements  if possible
            if(childElement["choice"]){
              if(childElement["choice"] instanceof Array){
                if(childElement["choice"].length < childNodes.length - xml.getElementsByTagName("properties").length){
                  childElement["choice"][idx+1] = structuredClone(childElement["choice"][idx]);
                }
                this.recursiveBuild(childElement["choice"][idx], child, packetId, debug)
                idx = idx + 1;
              } 
              else this.recursiveBuild(childElement["choice"], child, packetId, debug)            
            }else{
              // build out sibling elements or single elements if not an array
              if(childElement[SchemaParser.schemaSequenceName] instanceof Array) 
                this.recursiveBuild(childElement[SchemaParser.schemaSequenceName][childElement.occurs-1], child, packetId, debug)
              else this.recursiveBuild(childElement[SchemaParser.schemaSequenceName], child, packetId, debug)            
            }
          } catch (error) {
            console.log(error)
          }
      }
    }
  }

  roundParseInt(x) {
    const parsed = parseInt(x);
    if (isNaN(parsed)) { return 0; }
    return parsed;
  }

  roundParseIndex(x){
    const ijk = x.split(";")
    return ijk.reduce((accumulator, currentValue) => accumulator + this.roundParseInt(currentValue),0) || 1
  }

  async fileParser(file){
  
      let content = await readFileAsync(file);
      return this.byteParser(content)

  }

  // Converts UInt8 buffer to utf-8
  static stringMapper = (buffer)=>{
    var strBuff = new Array(buffer.length);
    for(let a = 0; a < buffer.length; a++){
      strBuff[a] = String.fromCharCode(buffer[a]);
    }
    return strBuff.join('');
  };


  addToHeader(content, valueStream, currPacketSize, currPacketType, currPacketId, step, nextIdx, currIdx){
    var parser = new DOMParser();
    if(step%2 === 0){
      let packetInfo = this.delimitPipe(valueStream);
      currPacketSize = packetInfo.pkgSize;
      currPacketType = packetInfo.pkgType;
      currPacketId = packetInfo.pkgId;
      if(/(Sx)/.test(currPacketType)){
        this.streamHeader = {stream: structuredClone((this.schema.stream)?this.schema.stream: this.schema.Stream)};
      }
      else if(/(Hx)/.test(currPacketType))
      {
        this.streams[currPacketId]= {dataset: structuredClone((this.schema.dataset)?this.schema.dataset: this.schema.Dataset)};
        this.staticKeys[currPacketId]=[];
        this.coordsys[currPacketId] = {}
      }
      else if(/(Cx)/.test(currPacketType)){
        this.streams[currPacketId]= {comment: structuredClone((this.schema.comment)?this.schema.comment: this.schema.Comment)};
        this.coordsys[currPacketId] = {}
      }
      else if(/(Ex)/.test(currPacketType)){
        this.streams[currPacketId]= {exception: structuredClone((this.schema.exception)?this.schema.exception: this.schema.Exception)};
        this.coordsys[currPacketId] = {}
      }
      else if(/(d)/.test(currPacketType))
        return {currPacketSize, currPacketId, currPacketType, nextIdx, breakout: true};
      nextIdx = packetInfo.nextIdx+currIdx;
    }else {
      currPacketSize = (100 > content.byteLength - nextIdx)? content.byteLength : 100;
    }
    return {currPacketSize, currPacketId, currPacketType, nextIdx};
  }

  // Function to speficially parse the Stream and Dataset information for each packet. This is assumed to be a static set of information per connection/https request.
  parseStreamHeader(content, step=0){
    if(this.debug)
      var start = performance.now();
    var currIdx = 0;
    var nextIdx = 0;
    // steps
    // 0 = packet type
    // 1 = packet ID
    // 2 = packet size in bytes
    // 3 = packet data
    var currPacketType = "";
    var currPacketSize = (100 > content.byteLength)? content.byteLength : 100;
    var currPacketId = 0;

    while(currIdx < content.byteLength){
      nextIdx = currIdx + currPacketSize
  
      var valueStream = new Uint8Array(content.slice(currIdx, nextIdx))
      // console.log(valueStream)

      let info = this.addToHeader(content, valueStream, currPacketSize, currPacketType, currPacketId, step, nextIdx, currIdx);
      // Move to next split
      if(info.breakout)
        break;
      currPacketType = info.currPacketType;
      currPacketId = info.currPacketId;
      currPacketSize = info.currPacketSize;
      currIdx = info.nextIdx;
      step = step + 1;
    }
    // this.schema = null;
    if(this.debug)
      console.log(`header parse runtime: ${performance.now() - start}`);

    if(currIdx >= content.byteLength)
      return {content: new ArrayBuffer(0), step: step};
    var slice = content.slice(currIdx, content.byteLength);
    return {content: slice, step: step};
  }
  
  *byteParser(content, step = 0, currPacketSize = 0){
    if(this.debug){
      var start = performance.now();
    }
    let mainstart = start;
    var currIdx = 0;
    var nextIdx = 0;
    // steps
    // i%2 = 0 : packet info/header
    // i%2 = 1 : packet header
    var currPacketType = "";
    var currPacketId;
    if(currPacketSize === 0)
      currPacketSize = (100 > content.byteLength)? content.byteLength : 100;

    var dataProps;
    while(currIdx < content.byteLength){
        dataProps={};
        nextIdx = currIdx + currPacketSize
        if(nextIdx > content.byteLength){
          // console.log(`Remaining Triggered: ${currPacketSize}`);
          if(this.debug){
            console.log(`step ${step} parse runtime: ${performance.now() - mainstart}`);
            console.log(this.performances)
          }
          return {content: content.slice(currIdx, content.byteLength), step: step, remaining: currPacketSize};
        }
        var valueStream = new Uint8Array(content.slice(currIdx, nextIdx))
        if(step%2 === 0){
          if(this.debug)
            start = performance.now();

          if(valueStream[0] !== 124)
          {
            currIdx--;
            valueStream = new Uint8Array(content.slice(currIdx, nextIdx))
          }
          
          let packetInfo = this.delimitPipe(valueStream);

          currPacketSize = packetInfo.pkgSize;
          currPacketType = packetInfo.pkgType;
          currPacketId = packetInfo.pkgId;
          
          if(!this.coordsys.hasOwnProperty(currPacketId)) {
            let info = this.addToHeader(content, valueStream, currPacketSize, currPacketType, currPacketId, step, nextIdx, currIdx);
            currPacketType = info.currPacketType;
            currPacketId = info.currPacketId;
            currPacketSize = info.currPacketSize;
            currIdx = info.nextIdx;
            nextIdx = currIdx + currPacketSize;
            step = step + 1;
            valueStream = new Uint8Array(content.slice(currIdx, nextIdx))
            info = this.addToHeader(content, valueStream, currPacketSize, currPacketType, currPacketId, step, nextIdx, currIdx);
            currPacketSize = info.currPacketSize;
            nextIdx = info.nextIdx;
          }else{
            nextIdx = packetInfo.nextIdx+currIdx;
          }


          if(this.debug){
            if(this.performanceStep ===0){
              console.log(`pck info parse runtime: ${performance.now() - start}`);
            }
            (this.performances['pck'])?this.performances['pck'] += performance.now()-start : this.performances['pck'] = performance.now()-start+1;
          }

        }else {
          currPacketSize = 100;
          
        } // Else

        // Move to next split
        currIdx = nextIdx;
        step = step + 1;
      }


      //SchemaParser.cleanSchema(this.schema);
      return {content: null, step: step};
  }

  parseData(dataProps, content, currPacketSize, currIdx, currPacketId){
    let remainingSize = currPacketSize;
    const eName = SchemaParser.schemaSequenceName;
    let start, mainstart;
    
    if(this.debug && this.performanceStep === 0)
      {mainstart = performance.now();}
    // Go through all noted values in Coordinate System and obtain info on data breakup
    for(var [key, isVector] of Object.entries(this.coordsys[currPacketId])){
      // Go through all versions of the coordinate system (specified that can be multiple)
      let occurs = this.streams[currPacketId]["dataset"][eName][key]["occurs"]
      let idx = 0
      for(var keyElement of this.streams[currPacketId]["dataset"][eName][key][eName])
      {
        
        // Physical Dimensionality changes behavior of packet
        //let dataType = this.streams[currPacketId]["dataset"][eName][key]["attributes"]["physDim"][keyIdx];
        let name = (this.streams[currPacketId]["dataset"][eName][key]["attributes"]["name"] ? 
                    (this.streams[currPacketId]["dataset"][eName][key]["attributes"]["name"][idx%occurs]):"");

        let coordType = (key.includes("coord"))? ("_" + this.streams[currPacketId]["dataset"][eName][key]["attributes"]["axis"][idx%occurs]):"";

        // Find whether we are utilizing vector or scalar data
        var workingElement = (/coord/.test(key.toLowerCase())&&!this.xsdCoord)? keyElement["scalar"]: keyElement["choice"][(isVector[name])?"vector":"scalar"];
        
        var numElements = (this.xsdCoord)? workingElement["occurs"]: workingElement[isVector[name]?eName:"choice"].length
        // Checks if next level is a sequence of choice, then goes through each one separately
        for(let idxOfOccurance = 0; idxOfOccurance < numElements; idxOfOccurance++)
        {
          let workingChildElement = workingElement[isVector[name]?eName:"choice"][idxOfOccurance]
          let elementKey = key +  "_" +  name + "_" + workingElement["attributes"]["use"][idxOfOccurance] + coordType;
          if(!dataProps[elementKey])
            dataProps[elementKey] = [];

          let ijkSize = (this.xsdCoord)? this.roundParseIndex(workingElement["attributes"]["index"][idxOfOccurance]): 
                                                  this.roundParseInt(workingElement["attributes"]["iSize"][idxOfOccurance]) + 
                                                  this.roundParseInt(workingElement["attributes"]["jSize"][idxOfOccurance]) + 
                                                  this.roundParseInt(workingElement["attributes"]["kSize"][idxOfOccurance]);
          
          // The WorkingChildElement can be 1 of 3 choices: Sequence, Packet, and Values. If else to find which functionality is needed
          if(SchemaParser.findElement(workingChildElement, "packet")["attributes"]["numItems"])
          {  
            var createDataView = (dataSize, idx, encoding, content, currentIdx)=>{
              let binSlice = content.slice(currentIdx, currentIdx+(idx*dataSize))
              // let littleEndian = encoding.slice(0, 2).toLowerCase().includes("le");
              // let dv = new DataView(binSlice);
              if(encoding.toLowerCase().includes("real")){
                switch(dataSize){
                  case 8: {
                    return new Float64Array(binSlice);
                    // return [dv.getFloat64(..., littleEndian)];
                    
                  }
                  default: {
                    // return dv.getFloat32(0, littleEndian);
                    return new Float32Array(binSlice);
                    
                  }
                }
              }
              else if(/[uU]int/.test(encoding.toLowerCase())){
                switch(dataSize){
                  case 4: {
                    return new Uint32Array(binSlice);
                    
                  }
                  case 2: {
                    return new Uint16Array(binSlice);
                    
                  }
                  default: {
                    return new Uint8Array(binSlice);
                    
                  }
                } 
              }
              else if(/[^uU]*int/.test(encoding.toLowerCase())){
                switch(dataSize){
                  case 8: {
                    // Mapped to string to avoid BigInt64 serialization issues with RTK's Immer implementation
                    var stringArr = []
                    var stringMapped = new BigInt64Array(binSlice)
                    stringMapped.forEach(x=>stringArr.push(x.toString()));
                    return stringArr;
                  }
                  case 4: {
                    return new Int32Array(binSlice);
                    
                  }
                  case 2: {
                    return new Int16Array(binSlice);
                    
                  }
                  default: {
                    return new Int8Array(binSlice);
                    
                  }
                } 
              }
              else if(/(date)|(utf8)|(ubyte)/.test(encoding.toLowerCase())){
                return DataParser.stringMapper(new Uint8Array(binSlice));
              }
              else{
                return "Unknown encoding. Data cannot be read"
              }
            }
            
            if(this.debug)
              start = performance.now();

            // TEST?: instead of saving the data here, just yield to the plot
            dataProps[elementKey].push(createDataView(
              parseInt(SchemaParser.findElement(workingChildElement, "packet")["attributes"]["itemBytes"]), 
              parseInt(SchemaParser.findElement(workingChildElement, "packet")["attributes"]["numItems"]),
              SchemaParser.findElement(workingChildElement, "packet")["attributes"]["encoding"], 
              content, currIdx + (currPacketSize-remainingSize)));
            remainingSize = remainingSize - parseInt(SchemaParser.findElement(workingChildElement, "packet")["attributes"]["itemBytes"]) * parseInt(SchemaParser.findElement(workingChildElement, "packet")["attributes"]["numItems"]);
          
            if(this.debug){
              if(this.performanceStep === 0)
              {
                console.log(`dataview parse runtime: ${performance.now() - start}`); 
              }
              (this.performances['bitslice'])?this.performances['bitslice'] += performance.now()-start : this.performances['bitslice'] = performance.now()-start +1;
            }
          
          // Used to generate the static interval values. Usually based off an offset reference point
          }else if(SchemaParser.findElement(workingChildElement, "sequence")["attributes"]["interval"] ){
            
            if(this.debug)
              start = performance.now();
            if(!this.staticKeys[currPacketId].includes(elementKey)){

              console.log(dataProps[elementKey].length)
              dataProps[elementKey].push(Array.from({length: ijkSize}, 
                (_, i) => (
                  this.roundParseInt(SchemaParser.findElement(workingChildElement, "sequence")["attributes"]["minval"]) +
                  i * parseFloat(SchemaParser.findElement(workingChildElement, "sequence")["attributes"]["interval"])
                  )));
                  
                // Tells the object parser to not continually append to data array
                // if(!this.staticKeys[currPacketId].includes(elementKey))

                if(dataProps[elementKey].length > 0)
                  this.staticKeys[currPacketId].push(elementKey)

                if(this.debug)
                  this.performanceTiggers += 1;
                
            }
            if(this.debug){
              if(this.performanceStep === 0)
                {
                  console.log(`sequence parse runtime: ${performance.now() - start}`);
                }
                (this.performances['sequence'])?this.performances['sequence'] += performance.now()-start : this.performances['sequence'] = performance.now()-start+1;
            }
          }else if(SchemaParser.findElement(workingChildElement, "values")["value"]){
            if(!this.staticKeys[currPacketId].includes(elementKey)){

              console.log(dataProps[elementKey].length)
              dataProps[elementKey].push(Array.from(
                SchemaParser.findElement(workingChildElement, "values")["value"].trim().split(";"), // Split string of values into individual values
                v=>parseFloat(v) // turn string into floating point array
                ));
                  
                // Tells the object parser to not continually append to data array
                // if(!this.staticKeys[currPacketId].includes(elementKey))

                if(dataProps[elementKey].length > 0)
                  this.staticKeys[currPacketId].push(elementKey)
                }
          }


          // Split the array into vectors
          if(isVector[name]){
            if(this.debug)
              start = performance.now();
            
            let nComponents = parseInt(SchemaParser.findElement(workingChildElement, "packet")["attributes"]["numItems"])/ijkSize;
            let tempArr = [];
            if(dataProps[elementKey].length > 0){
              for(var i = 0; i < dataProps[elementKey][0].length; 
                i = i + nComponents){
                  tempArr.push([])
                  for(var j = 0; j < nComponents; j++){
                    tempArr[Math.floor(i/nComponents)].push(dataProps[elementKey][0][i+j])
                  }
                  
                }
                dataProps[elementKey][0] = tempArr;
            }
            
            if(this.debug){
              if(this.performanceStep === 0)
              {
                console.log(`vectorizer parse runtime: ${performance.now() - start}`);
              }
              (this.performances['vectorizer'])?this.performances['vectorizer'] += performance.now()-start : this.performances['vectorizer'] = performance.now()-start+1;
            }

          }
          
        } // For
        idx++;
      } // For
    } // For

    if(this.debug){
      if(this.performanceStep === 0){
        this.performanceStep = 1;
        console.log(`1 step parse runtime: ${performance.now() - mainstart}`);
      }
    }

    // console.log(`Sequence triggers: ${this.performanceTiggers}`)
    return {dataProps: dataProps, currPacketId: currPacketId};
  } // Function

}




 export default DataParser;
