// #include <iostream>
// #include <algorithm>
// #include <vector>
// #include <string>
// #include <streambuf>
// #include <boost/property_tree/json_parser.hpp>
// #include <boost/property_tree/xml_parser.hpp>

// using namespace std;
// namespace pt = boost::property_tree;

// pt::ptree parsing(pt::ptree &schema){
//     schema = schema.querySelector('schema');
//     var toplvl = schema.querySelectorAll(':scope > element');
//     this.complexTypes = Array.from(schema.querySelectorAll(':scope > complexType'));
//     this.schema = new Node();

    
//     for(var i = 0; i < toplvl.length; i=i+1){
//         this.schema = this.buildComplexType(toplvl[i].getAttribute('type'), this.schema);
//     }
// }

// buildSequence(node, schema = new Node()){
//     node.querySelectorAll(':scope > element').forEach((x)=>{
//         schema = this.buildElement(x, schema)
//     })
//     node.querySelectorAll(":scope > choice").forEach((x)=>{
//         schema['choice'] = this.buildChoices(x);
//         schema['choice'] = this.accountForMultiple(x, schema['choice'], true);
//     })
//     return schema;
// }

// buildChoices(node, schema = new Node()){
//     var choices = node.querySelectorAll(":scope > element");
//     // lambda approach
//     if(this.lambdaApproach){
//         var pickChoice = (x)=>{
            
//             return this.buildElement(
//                     choices[
//                         Array.from(choices).findIndex(
//                             (choice)=>{return choice.getAttribute('name').toLowerCase()===x.tagName.toLowerCase()}
//                             )
//                     ]
//                 )

//         };
//         return pickChoice
//     }

//     // value approach
//     choices.forEach((x)=>{
//         schema = this.buildElement(x, schema);
//     })
//     return schema
// }

// buildElement(element, schema = new Node()){   
//     schema = this.buildComplexType(element.getAttribute('type'), schema, element.getAttribute('name'));     
//     schema = this.accountForMultiple(element, schema)
//     return schema;
// }

// buildComplexType(name, schema = new Node(), baseName=null){
//     var element = this.complexTypes.find(x=>x.getAttribute('name').toLowerCase()===name.toLowerCase());
//     var usedName = (baseName)? baseName:name;
//     usedName = usedName.toLowerCase();
//     schema[usedName] = new Node();
//     element.querySelectorAll(":scope > sequence").forEach((x)=>{
//         schema[usedName][SchemaParser.schemaSequenceName] = this.buildSequence(x);
//     });
//     element.querySelectorAll(":scope > choice").forEach((x)=>{
//         schema[usedName]["choice"]=this.buildChoices(x);
//         schema[usedName]["choice"] = this.accountForMultiple(x, schema[usedName]["choice"], true);
//     });

//     var attr;
//     var simpleContent = element.querySelectorAll(":scope > simpleContent");
//     if(simpleContent.length > 0){
//         attr = element.querySelectorAll(":scope > simpleContent > extension > attribute")
//     }else{
//         attr = element.querySelectorAll(":scope > attribute")
//     }
//     if(attr.length > 0){
//         schema[usedName]["attributes"] = {};
//         attr.forEach((x)=>{
//             schema[usedName]["attributes"][x.getAttribute('name')]= null;
//         });
//         if(usedName === 'p' || simpleContent.length > 0)
//             schema[usedName]["value"] = null
//     }
//     return schema;
// }

// accountForMultiple(element, schema = new Node(), choice=false, bypass=false){
//     if(element.hasAttribute('minOccurs') || element.hasAttribute('maxOccurs') || bypass){
//         let addArrayElement = (part)=>{
//             schema[part.getAttribute('name').toLowerCase()]["occurs"] = 0;
//             if(schema[part.getAttribute('name').toLowerCase()].hasOwnProperty('attributes')){
//                 Object.keys(schema[part.getAttribute('name').toLowerCase()]["attributes"]).forEach((ele)=>{
//                     schema[part.getAttribute('name').toLowerCase()]["attributes"][ele] = [];
//                 })
//             }
//             if(schema[part.getAttribute('name').toLowerCase()].hasOwnProperty('value')){
//                 schema[part.getAttribute('name').toLowerCase()]["value"] = [];
//             }
            
//             if(schema[part.getAttribute('name').toLowerCase()].hasOwnProperty('choice')){
//                 schema[part.getAttribute('name').toLowerCase()]['choice'] = [schema[part.getAttribute('name').toLowerCase()]['choice']]
//             }else if(schema[part.getAttribute('name').toLowerCase()].hasOwnProperty(SchemaParser.schemaSequenceName)){
//                 schema[part.getAttribute('name').toLowerCase()][SchemaParser.schemaSequenceName] = [schema[part.getAttribute('name').toLowerCase()][SchemaParser.schemaSequenceName]]
//             } 
            
//         }
//         if(choice){
//             for(let child of element.children){
//                 addArrayElement(child)
//             }
//         }
//         else{
//             addArrayElement(element)
//         }
//     }
//     return schema;
// }