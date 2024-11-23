import {convertSchemaToDocument, convertSchemaToDocumentCoord} from "./Schema";
class SchemaParser{
    static schemaSequenceName = 'elements'
    static xsdCoord =true;
    constructor(){
        this.schema = new Node();
        this.complexTypes = null;
        this.lambdaApproach = false;
        this.debug = false;
    }


    parseXsd(){
        var schema = (SchemaParser.xsdCoord)? convertSchemaToDocumentCoord():convertSchemaToDocument();
        this.parsing(schema)
    }

    parsing(schema){
        schema = schema.getElementsByTagName("xs:schema")[0];
        var toplvl = schema.getElementsByTagName("xs:element");
        this.complexTypes = Array.from(schema.getElementsByTagName('xs:complexType'));
        this.schema = new Node();

        
        for(var i = 0; i < toplvl.length; i=i+1){
            this.schema = this.buildComplexType(toplvl[i].getAttribute('type'), this.schema);
        }
    }

    buildSequence(node, schema = new Node()){
        Array.from(node.getElementsByTagName("xs:element")).forEach((x)=>{
            schema = this.buildElement(x, schema)
        })
        Array.from(node.getElementsByTagName("xs:choice")).forEach((x)=>{
            schema['choice'] = this.buildChoices(x);
            schema['choice'] = this.accountForMultiple(x, schema['choice'], true);
        })
        return schema;
    }

    buildChoices(node, schema = new Node()){
        var choices = node.getElementsByTagName("xs:element");
        // lambda approach
        if(this.lambdaApproach){
            var pickChoice = (x)=>{
                
                return this.buildElement(
                        choices[
                            Array.from(choices).findIndex(
                                (choice)=>{return choice.getAttribute('name').toLowerCase()===x.tagName.toLowerCase()}
                                )
                        ]
                    )
    
            };
            return pickChoice
        }

        // value approach
        Array.from(choices).forEach((x)=>{
            schema = this.buildElement(x, schema);
        })
        return schema
    }

    buildElement(element, schema = new Node()){   
        schema = this.buildComplexType(element.getAttribute('type'), schema, element.getAttribute('name'));     
        schema = this.accountForMultiple(element, schema)
        return schema;
    }

    buildComplexType(name, schema = new Node(), baseName=null){
        var element = this.complexTypes.find(x=>x.getAttribute('name').toLowerCase()===name.toLowerCase());
        var usedName = (baseName)? baseName:name;
        usedName = usedName.toLowerCase();
        schema[usedName] = new Node();
        Array.from(element.getElementsByTagName("xs:sequence")).forEach((x)=>{
            schema[usedName][SchemaParser.schemaSequenceName] = this.buildSequence(x);
        });
        Array.from(element.getElementsByTagName("xs:choice")).forEach((x)=>{
            schema[usedName]["choice"]=this.buildChoices(x);
            schema[usedName]["choice"] = this.accountForMultiple(x, schema[usedName]["choice"], true);
        });

        
        var attr;
        var simpleContent = element.getElementsByTagName("xs:simpleContent");
        if(simpleContent.length > 0){
            attr = element.
                getElementsByTagName("xs:simpleContent")[0].
                getElementsByTagName("xs:extension")[0].
                getElementsByTagName("xs:attribute")
        }else{
            attr = element.getElementsByTagName("xs:attribute")
        }
        attr = Array.from(attr);
        if(attr.length > 0){
            schema[usedName]["attributes"] = {};
            attr.forEach((x)=>{
                schema[usedName]["attributes"][x.getAttribute('name')]= null;
            });
            if(usedName === 'p' || simpleContent.length > 0)
                schema[usedName]["value"] = null
        }
        return schema;
    }
    
    accountForMultiple(element, schema = new Node(), choice=false, bypass=false){
        if(element.hasAttribute('minOccurs') || element.hasAttribute('maxOccurs') || bypass){
            let addArrayElement = (part)=>{
                if(part.nodeName === '#text') return;
                schema[part.getAttribute('name').toLowerCase()]["occurs"] = 0;
                if(schema[part.getAttribute('name').toLowerCase()].hasOwnProperty('attributes')){
                    Object.keys(schema[part.getAttribute('name').toLowerCase()]["attributes"]).forEach((ele)=>{
                        schema[part.getAttribute('name').toLowerCase()]["attributes"][ele] = [];
                    })
                }
                if(schema[part.getAttribute('name').toLowerCase()].hasOwnProperty('value')){
                    schema[part.getAttribute('name').toLowerCase()]["value"] = [];
                }
                
                if(schema[part.getAttribute('name').toLowerCase()].hasOwnProperty('choice')){
                    schema[part.getAttribute('name').toLowerCase()]['choice'] = [schema[part.getAttribute('name').toLowerCase()]['choice']]
                }else if(schema[part.getAttribute('name').toLowerCase()].hasOwnProperty(SchemaParser.schemaSequenceName)){
                    schema[part.getAttribute('name').toLowerCase()][SchemaParser.schemaSequenceName] = [schema[part.getAttribute('name').toLowerCase()][SchemaParser.schemaSequenceName]]
                } 
                
            }
            if(choice){
                for(let child of element.childNodes){
                    addArrayElement(child)
                }
            }
            else{
                addArrayElement(element)
            }
        }
        return schema;
    }

    // TODO: Fix finding elements
    static findElement(schema, elementName, debug=false){
        if(debug){
            console.log(`Looking for: ${elementName}`)
        }

        var schemaFound = schema.hasOwnProperty(elementName);
        if(schemaFound){
            return schema[elementName]
        }

        var returnVal = null;
        for(var key of Object.keys(schema)){
            if(debug){
                console.log(`Entered: ${key}`);
                console.log(`Properties: ${Object.getOwnPropertyNames(schema[key])}`);
                console.log(schema[key].hasOwnProperty(SchemaParser.schemaSequenceName));
                
            }
            if(schema[key].hasOwnProperty(elementName)){
                returnVal = schema[key][elementName]
            }
            else if(schema[key].hasOwnProperty(SchemaParser.schemaSequenceName)){      
                returnVal = SchemaParser.findElement(schema[key][SchemaParser.schemaSequenceName], elementName)
            }else if(schema[key].hasOwnProperty('choice')){
                returnVal = SchemaParser.findElement(schema[key]['choice'], elementName)
            }
            if(returnVal)
                break

        }
        return returnVal
        //throw `Element "${elementName}" not found`   
    }

    static fillElement(element, refXml, debug=false){
        if(debug){
            console.log(element)
        }
        var occurs = element.hasOwnProperty('occurs')
        if(element.hasOwnProperty(this.schemaSequenceName) && occurs)
                element[this.schemaSequenceName].push(structuredClone(element[this.schemaSequenceName][element[this.schemaSequenceName].length-1]))
        if(element.hasOwnProperty('attributes')){
            for(var key of Object.keys(element.attributes)){
                if(!occurs){
                    element.attributes[key] = decodeURIComponent(escape(refXml.getAttribute(key)))
                }else{
                    element.attributes[key].push(decodeURIComponent(escape(refXml.getAttribute(key))))
                }
            }
        }

        // Slowdown, but working check for data values
        if(element.hasOwnProperty('value')){
            let innerHtml = (refXml.innerHTML)?(refXml.innerHTML):refXml.firstChild.data;
            if(!occurs){
                element.value = innerHtml;
            }else{
                element.value.push(innerHtml)
            }
        }
        if(refXml.tagName.toLowerCase().includes("values")){
            let innerHtml = (refXml.innerHTML)?(refXml.innerHTML):refXml.firstChild.data;
            if(!occurs){
                element["value"] = innerHtml
            }else{
                if(!element["value"]) element["value"] = [];
                element["value"].push(innerHtml)
            }
        }
        if(occurs){
            element.occurs = element.occurs+1;
        }

        return element
    }

    static cleanSchema(schema){
        Object.keys(schema).forEach(key=>{
            if(schema[key]===null)
                {delete schema[key]}
            else
                {SchemaParser.cleanSchema(schema[key])}
        })
    }

}

class Node extends Object{
    element(idx){
        return this[SchemaParser.schemaSequenceName][idx]
    }
}

export default SchemaParser;