
import das2CSchema from '../../../submodules/das2C/schema/das-basic-stream-v3.0.xsd?raw'
import { DOMParser } from '@xmldom/xmldom'

function convertSchemaToDocument(){
  const schema=`<?xml version="1.0"?>
  <!-- 
    This is a multi-root, no-namespace schema definition.  It will validate any
    one of the top-level das 3.0 stream root elements, <stream>, <dataset>,
    <comment> or <exception> so long as an 'xmlns' attribute is not included.  
    Of course to be well-formed only *one* of the elements above may form a
    header packet.
  
    See the file das2-basic-stream-ns-v3.0.xsd for a multi-root schema 
    definition for files using a declared namespace
  
    See the file das2-basic-doc-v3.0.xsd for a single-root schema definition
    suitable for validating standard (i.e. non-packitized) documents.
  -->
  <xs:schema xmlns:xs="http://www.w3.org/2001/XMLSchema"
    version="3.0"
    elementFormDefault="qualified"
    attributeFormDefault="unqualified"
   >
  <!-- targetNamespace="das-basic-stream" xmlns="das-basic-stream" -->
  
  
  <!-- General Fields -->
  
  <!-- The names for things that could be variables in most languages -->
  <xs:simpleType name="VarName">
    <xs:restriction base="xs:string">
      <xs:pattern value="[a-zA-Z][a-zA-Z0-9_]*"/>
      <xs:maxLength value="63"/> <!-- leave rooom for null char -->
    </xs:restriction>
  </xs:simpleType>
  
  <!-- The names for things that could be variables or struct + member 
       names in most languages -->
  <xs:simpleType name="StructName">
    <xs:restriction base="xs:string">
      <xs:pattern value="[a-zA-Z][a-zA-Z0-9_\.\-,:]*"/>
      <xs:maxLength value="63"/> <!-- leave rooom for null char -->
    </xs:restriction>
  </xs:simpleType>
  
  <!-- Parameter dimension names, typically physical dimensions. Absense of a
       physical dimension can be indicated by an explicit empty string  -->
  <xs:simpleType name="PhysDimName">
    <xs:restriction base="xs:string">
      <xs:pattern value="[*]{0}|[a-zA-Z][a-zA-Z0-9_\.]*"/>
      <xs:maxLength value="63"/> <!-- leave rooom for null char -->
    </xs:restriction>
  </xs:simpleType>
  
  
  <!-- Properties ========================================================== -->
  
  <!-- Alt prop by language -->
  <xs:simpleType name="ISO639_1">
    <xs:restriction base="xs:string">
      <xs:pattern value="[a-zA-Z][a-zA-Z0-9_\-]+"/>
      <xs:maxLength value="8"/> <!-- leave rooom for null char -->
    </xs:restriction>
  </xs:simpleType>
  
  <xs:complexType name="AltProp">
    <xs:simpleContent>
      <xs:extension base="xs:string" >
        <xs:attribute name="lang" type="ISO639_1" use="required" />
      </xs:extension>
    </xs:simpleContent>
  </xs:complexType>
  
  <!-- The data types for properties. Same as ValueType below with ranges -->
  <xs:simpleType name="PropType">
    <xs:restriction base="xs:string">
      <xs:enumeration value="bool" />
      <xs:enumeration value="datetime" />
      <xs:enumeration value="datetimeRange" />
      <xs:enumeration value="int" />
      <xs:enumeration value="intRange" />
      <xs:enumeration value="real" />
      <xs:enumeration value="realRange" />
      <xs:enumeration value="string" />
     </xs:restriction>
  </xs:simpleType>
  
  <!-- Single property -->
  <xs:complexType name="Property" mixed="true">
     <xs:sequence>
       <xs:element name="alt" type="AltProp" minOccurs="0" maxOccurs="unbounded" />
     </xs:sequence>
     <xs:attribute name="name"  type="StructName" use="required" />
     <xs:attribute name="type"  type="PropType" default="string" />
     <xs:attribute name="units" type="xs:token" />
  </xs:complexType>
  
  <!-- Properties grouping -->
  <xs:complexType name="Properties">
    <xs:sequence>
      <xs:element name="p" type="Property" minOccurs="1" maxOccurs="unbounded"/>
    </xs:sequence>
  </xs:complexType>
  
  
  <!-- Extensions ========================================================== -->
  
  <!-- Extension tags can hold anything except for elements defined in this
    namespace.  They can also have any attributes.  Client stream processors
    should pass stream-level extension elements unchanged dataset level 
    extension element handling is undefined 
  -->
  <xs:complexType name="Extension" mixed="true">
    <xs:sequence>
      <xs:choice>
        <!-- Can extend with other elements here, but they can't have a namespace -->
        <xs:any namespace="##local" processContents="skip" minOccurs="0" maxOccurs="unbounded"/>
      </xs:choice>
    </xs:sequence>
  
    <xs:attribute name="scheme" type="xs:string" use="required"/>
    <xs:attribute name="content" type="xs:string" use="required"/>
  
    <!-- Can extend with other attributes, will be skipped by schema -->
    <xs:anyAttribute processContents="skip" />
  </xs:complexType>
  
  
  <!-- Datasets ============================================================ -->
  
  <!-- Each dataset header defines a das dataset and how it appears in the data
       stream.  The object containment hirearchy is depected in the middle of
       the reference poster, 
       
          https://das2.org/das2_AGU2019.pdf 
           
       and summarized below:
       
         Stream
           |
           |- Dataset 1
           |- Dataset 2
           |- Dataset 3
           |- .....
         
         Dataset  <dataset>
           |
           |- Physical Dimension <physDim>
               |
               |- Variable        <scalar> <vector>
                   |
                   |- Quantities   <values> <sequence> <i>
  -->
  
  <xs:simpleType name="Star" final="restriction">
    <xs:restriction base="xs:string">
      <xs:enumeration value="*" />
    </xs:restriction>
  </xs:simpleType>
  
  <xs:simpleType name="EmptyStar" final="restriction">
    <xs:restriction base="xs:string">
      <xs:enumeration value="*" />
      <xs:enumeration value="" />
    </xs:restriction>
  </xs:simpleType>
  
  <xs:simpleType name="NonZeroStar">
    <xs:union memberTypes="Star xs:positiveInteger" />
  </xs:simpleType>
  
  <xs:simpleType name="Empty" >
    <xs:restriction base="xs:string">
      <xs:enumeration value="" />
    </xs:restriction>
  </xs:simpleType>
  
  <xs:simpleType name="IntTwoOrMore" >
    <xs:restriction base="xs:positiveInteger">
      <xs:minInclusive value="2" />
      <xs:maxInclusive value="2147483647" />
    </xs:restriction>
  </xs:simpleType>
  
  <xs:simpleType name="EmptyPosInt" >
    <xs:union memberTypes="IntTwoOrMore Empty" />
  </xs:simpleType>
  
  <!-- The data types for values, does not support ranges -->
  <xs:simpleType name="ValueType">
    <xs:restriction base="xs:string">
        <xs:pattern value="bool|datetime|int|real|string" />
     </xs:restriction>
  </xs:simpleType>
  
  <!-- Data value types in packets, sizes and formats -->
  <xs:simpleType name="EncodingType">
    <xs:restriction base="xs:string">
      <xs:pattern 
        value="byte|ubyte|utf8|BEint|BEuint|BEreal|LEint|LEuint|LEreal" />
     </xs:restriction>
  </xs:simpleType>
  
  <xs:simpleType name="ValuesContent">
    <!-- The regex for scientific notation is looooong, just make sure
         illegal characters are not present -->       
    <xs:restriction base="xs:string">
      <xs:pattern value="[0-9\+\-;\.eE\s]*" />
      <xs:whiteSpace value="collapse" />
    </xs:restriction>
  </xs:simpleType>
  
  <xs:simpleType name="ValRepeat">
    <xs:restriction base="xs:string">
      <xs:pattern value="none|whole|each" />
    </xs:restriction>
  </xs:simpleType>
  
  <!-- Variable length data values
  
    By default no terminators are defined and an app must rely on itemBytes in
    <packet> is used to determine where fields end.  Alternatively fexible width
    fields may be used in one of two ways:
  
       1. Provide a length tag before each value, ex: "|17|Some event string"
  
       2. Provide a value terminator.  Unlike separators in most languages, 
          terminators MUST follow each value, even the last value.
  
    In either case, specify that values are variable length using itemsBytes="*"
    and if terminators are in use, give the terminator character which must be 
    from the set | \ ? : ; ~ # ^ @ $.
  
    The suggested value terminator is ";" though no default is given.
  -->
  <xs:simpleType name="Terminator" >
    <xs:restriction base="xs:string" >
      <xs:pattern value="[\|/\\\?:;~#\^@$]" />
      <xs:pattern value="\\n" />
      <!-- <xs:pattern value="[\|\\/\?:;~\^$#@]" /> -->
    </xs:restriction>
  </xs:simpleType>
  
  <!-- An array variable in the header -->
  <xs:complexType name="Values">
    <xs:simpleContent>
       <xs:extension base="ValuesContent" >
        <xs:attribute name="repeat" type="ValRepeat" default="none" />
        <xs:attribute name="repetitions" type="xs:positiveInteger"/>
  
        <!-- Since values elements have a natural end point, no terminator
          is needed for the last value, so they are called separators here -->
        <xs:attribute name="valSep" type="Terminator" default=";" />
      </xs:extension>
    </xs:simpleContent>
  </xs:complexType>
  
  <xs:complexType name="Sequence">
    <xs:attribute name="use"      type="VarRole"  default="center" />
    <xs:attribute name="minval"   type="xs:double" use="required"/>
    <xs:attribute name="interval" type="xs:double" use="required"/>
    <xs:attribute name="repeat"   type="ValRepeat" default="none"/>
    <xs:attribute name="repetitions" type="xs:positiveInteger" />
  </xs:complexType>
  
  <xs:complexType name="Packet">
    <xs:attribute name="numItems" type="NonZeroStar" use="required" />
    <xs:attribute name="itemBytes" type="NonZeroStar" use="required" />
    <xs:attribute name="encoding" type="EncodingType" use="required" />
    <xs:attribute name="valTerm" type="Terminator" />
  </xs:complexType>
  
  <!-- The purposes for values of a variable -->
  
  <xs:simpleType name="VarRole">
    <xs:restriction base="xs:string">
      <xs:enumeration value="center" />
      <xs:enumeration value="offset" />
      <xs:enumeration value="average" />
      <xs:enumeration value="count" />
      <xs:enumeration value="min" />
      <xs:enumeration value="reference" />  <!-- AKA the min -->
      <xs:enumeration value="max" />
      <xs:enumeration value="width" />
      <xs:enumeration value="std_dev" />
      <xs:enumeration value="min_error" />
      <xs:enumeration value="max_error" />    
    </xs:restriction>
  </xs:simpleType>
  
  <xs:complexType name="ScalarVar" >
    <xs:choice>
      <xs:element name="values" type="Values" />
      <xs:element name="sequence" type="Sequence" />
      <xs:element name="packet" type="Packet" />
    </xs:choice>
    <xs:attribute name="use"     type="VarRole" default="center" />
    <xs:attribute name="units"   type="xs:token" use="required" />
    <xs:attribute name="valType" type="ValueType" use="required" />
    <xs:attribute name="fill"    type="xs:string" />
    <xs:attribute name="iSize"   type="EmptyStar" default="*" />
    <xs:attribute name="jSize"   type="EmptyPosInt" />
    <xs:attribute name="kSize"   type="EmptyPosInt" />
  </xs:complexType>
  
  <!-- Vectors, Inherit from scalars and add elements ======== -->
  
  <xs:complexType name="Component">
    <xs:attribute name="name"  type="VarName" use="required" />
    <xs:attribute name="units" type="xs:token" />
    <xs:attribute name="fill"  type="xs:string" />
  </xs:complexType>
  
  
  <xs:simpleType name="VectorClass">
    <xs:restriction base="xs:string">
      <xs:enumeration value="cartesian" />
      <xs:enumeration value="polar" />
      <xs:enumeration value="spherical" />
      <!-- More?? -->
    </xs:restriction>
  </xs:simpleType>
  
  <xs:complexType name="VectorVar" >
    <xs:sequence>
      <xs:element name="component" type="Component" minOccurs="2" maxOccurs="3" />
      <xs:choice>
        <xs:element name="values" type="Values" />
        <xs:element name="sequence" type="Sequence" />
        <xs:element name="packet" type="Packet" />
      </xs:choice>
    </xs:sequence>
    <xs:attribute name="use"     type="VarRole" default="center" />
    <xs:attribute name="units"   type="xs:token" use="required" />
    <xs:attribute name="valType" type="ValueType" use="required" />
    <xs:attribute name="fill"    type="xs:string" />
    <xs:attribute name="iSize"   type="EmptyStar" default="*" />
    <xs:attribute name="jSize"   type="EmptyPosInt" />
    <xs:attribute name="kSize"   type="EmptyPosInt" />
    <xs:attribute name="vecClass"   type="VectorClass" use="required" />
  </xs:complexType>
  
  <!-- Physical Dimensions ================================================= -->
  
  <xs:complexType name="CoordDim">
    <xs:sequence>
      <xs:element name="properties" type="Properties" minOccurs="0"/>
  
      <xs:choice minOccurs="1" maxOccurs="unbounded">      
        <xs:element name="scalar" type="ScalarVar" />
        <xs:element name="vector" type="VectorVar" />
      </xs:choice>
  
    </xs:sequence>
    <xs:attribute name="physDim" type="PhysDimName" use="required"/>
  </xs:complexType>
  
  <xs:complexType name="DataDim">
    <xs:sequence>
      <xs:element name="properties" type="Properties" minOccurs="0"/>
      <xs:choice minOccurs="1" maxOccurs="unbounded">      
        <xs:element name="scalar" type="ScalarVar" />
        <xs:element name="vector" type="VectorVar" />
      </xs:choice>
    </xs:sequence>
  
    <xs:attribute name="physDim" type="PhysDimName" use="required"/>
    <!-- 
    Data items must have unique names, however the name inherits from the overall
    dataset name.  So if you only have one <data> or <extData> element, the name
    isn't needed
    -->
    <xs:attribute name="name" type="StructName" />
  </xs:complexType>
  
  <!-- Extended data objects in an extended data section -->
  <xs:complexType name="DataObject">
    <xs:sequence>
      <xs:element name="packet" type="Packet" minOccurs="1" maxOccurs="unbounded" />
    </xs:sequence>
  
    <xs:attribute name="scheme"  type="xs:string" use="required" />
    <xs:attribute name="objType" type="xs:string" use="required" />
    <xs:attribute name="content" type="xs:string" />
    <xs:attribute name="iSize"   type="EmptyStar" default="*" />
    <xs:attribute name="jSize"   type="EmptyPosInt" />
    <xs:attribute name="kSize"   type="EmptyPosInt" />
  </xs:complexType>
  
  <xs:complexType name="ExtendedData">
    <xs:sequence>
      <xs:element name="properties" type="Properties" minOccurs="0"/>
      <xs:element name="object" type="DataObject" minOccurs="1" maxOccurs="unbounded" />
    </xs:sequence>
  
    <!-- 
    Extended data items must have unique names, however the name inherits 
    from the overall dataset name.  So if you only have one <data> or 
    <extData> element, the name isn't needed
    -->
    <xs:attribute name="name" type="StructName"/>
  </xs:complexType>
  
  
  <xs:simpleType name="DatasetRank">
    <xs:restriction base="xs:positiveInteger">
      <xs:minInclusive value="1" />
  
      <!-- To expand this we'll need to add wSize, etc. OR just have shape="" 
           have special parsers for the shape value.  That's probably best
           left to get general streams -->
      <xs:maxInclusive value="3" />
  
    </xs:restriction>
  </xs:simpleType>
  
  <xs:simpleType name="DatasetName">
    <xs:restriction base="xs:string">
      <xs:pattern value="[a-zA-Z][a-zA-Z0-9_\.]*"/>
      <xs:maxLength value="63"/> <!-- leave rooom for null char -->
     </xs:restriction>
  </xs:simpleType>
  
  <xs:complexType name="Dataset">
    <xs:sequence>
      <xs:element name="properties" type="Properties" minOccurs="0" />
      <xs:element name="extension" type="Extension" minOccurs="0" maxOccurs="unbounded" />
  
      <!-- 
      Bad news, a choice of one of x xy xyz rφ ρφz rθφ is not deterministic in 
      the XSD language because you can't tell which sequence you are on from the
      first element.  Even though only those patterns are allowed, further checking
      will have to depend on schematron
      -->
  
      <!-- Schematron: x, xy or xyz -->
      <xs:element name="xCoord" type="CoordDim" minOccurs="0" maxOccurs="unbounded" />
  
      <!-- Schematron: xy or xyz -->
      <xs:element name="yCoord" type="CoordDim" minOccurs="0" maxOccurs="unbounded" />
      
      <!-- Schematron: Cylindrical ρφz -->    
      <xs:element name="rhoCoord" type="CoordDim" minOccurs="0" maxOccurs="unbounded" />
      
      <!-- Schematron: Polar or Spherical rφ rθφ -->
      <xs:element name="rCoord" type="CoordDim" minOccurs="0" maxOccurs="unbounded" />
  
      <!-- Schematron: Spherical rθφ -->
      <xs:element name="thetaCoord" type="CoordDim" minOccurs="0" maxOccurs="unbounded" />
  
      <!-- Schematron: Cylindrical or Spherical ρφz or rθφ --> 
      <xs:element name="phiCoord" type="CoordDim" minOccurs="0" maxOccurs="unbounded" />
  
      <!-- Schematron: Cartesian or Cylindrical xyz or ρφz -->
      <xs:element name="zCoord" type="CoordDim" minOccurs="0" maxOccurs="unbounded" />
      
      <!-- 
      To see if a set of data vary in less then the number of coordinate dimensions
      one needs to:
      
        1. Get the shape in index space of each coordinate physical-dimension
        2. Get the shape in index space of each data physical-dimension
        3. See if the intersection of the data index space and each coordinate index
           space is non-zero.
  
      This is a complex concept that needs explicit examples but it's the only way 
      I found to stream data that should be painted on the X-Y plane, with data that
      should be painted on the X-Z plane, with data that should be painted on the 
      Y-Z plane along with volumetric data in the middle.  I tried to make it simpler
      but could not think of a way to do so without repeating the limitations of the
      CDF ISTP metadata model. -cwp 2020-07-17
      -->
      
      <xs:element name="data" type="DataDim" minOccurs="0" maxOccurs="unbounded" />
      <xs:element name="extData" type="ExtendedData" minOccurs="0" maxOccurs="unbounded" />
  
    </xs:sequence>
  
    <xs:attribute name="rank" type="DatasetRank" use="required" />
    <xs:attribute name="name" type="DatasetName" use="required"/>
    <xs:attribute name="iSize" type="Star" default="*" />
    <xs:attribute name="jSize" type="xs:positiveInteger" />
    <xs:attribute name="kSize" type="xs:positiveInteger" />
  
  </xs:complexType>
  
  
  <!-- Since patch levels don't affect API's we don't include the patch 
       level version number here -->
  <xs:simpleType name="StreamVersion">
    <xs:restriction base="xs:string">
      <xs:pattern value="[0-9]{1,3}\.[0-9]{1,3}" />
    </xs:restriction>  
  </xs:simpleType>
  
  <xs:simpleType name="StreamType">
    <xs:restriction base="xs:string">
      <xs:enumeration value="das-basic-stream" />
    </xs:restriction>
  </xs:simpleType>
  
  <xs:complexType name="Stream">
    <xs:sequence>
      <xs:element name="properties" type="Properties" minOccurs="0"/>
      <xs:element name="extension" type="Extension" minOccurs="0" maxOccurs="unbounded" />
    </xs:sequence>
    <xs:attribute name="type" type="StreamType" use="required" />
    <xs:attribute name="version" type="StreamVersion" use="required" />
    <xs:attribute name="lang" type="ISO639_1" default="en"/>
  </xs:complexType>
  
  <!-- Exceptions =========================================================== -->
  
  <xs:complexType name="Exception">
    <xs:simpleContent>
      <xs:extension base="xs:string" >
        <xs:attribute name="type" type="xs:token" use="required"/>
        
        <!-- Can extend with other attributes, will be skipped by schema -->
        <xs:anyAttribute processContents="skip" />
      </xs:extension>
    </xs:simpleContent>
  </xs:complexType>
  
  <!-- Comments ============================================================= -->
  
  <xs:complexType name="Comment">
    <xs:simpleContent>
      <xs:extension base="xs:string" >
        <xs:attribute name="type" type="xs:token" use="required"/>
        <xs:attribute name="source" type="xs:normalizedString"/>
       
        <!-- Can extend with other attributes, will be skipped by schema -->
        <xs:anyAttribute processContents="skip" />
      </xs:extension>
    </xs:simpleContent>
  </xs:complexType>
  
  <!-- Top-level Elements we will validate ================================= -->
  
  <xs:element name="stream"    type="Stream" />
  <xs:element name="extension" type="Extension" />
  <xs:element name="dataset"   type="Dataset" />
  <xs:element name="exception" type="Exception" />
  <xs:element name="comment"   type="Comment" />
  
  </xs:schema>
  `

  ;


  var dp = new DOMParser();
  return dp.parseFromString(schema, 'text/xml')
  

}


function convertSchemaToDocumentCoord(){
  var dp = new DOMParser();
  return dp.parseFromString(das2CSchema, 'text/xml')
}

export {convertSchemaToDocument, convertSchemaToDocumentCoord};
