"use strict";
// THIS FILE IS AUTOMATICALLY GENERATED BY SPACETIMEDB. EDITS TO THIS FILE
// WILL NOT BE SAVED. MODIFY TABLES IN YOUR MODULE SOURCE CODE INSTEAD.
Object.defineProperty(exports, "__esModule", { value: true });
exports.SetName = void 0;
/* eslint-disable */
/* tslint:disable */
// @ts-nocheck
const spacetimedb_sdk_1 = require("@clockworklabs/spacetimedb-sdk");
/**
 * A namespace for generated helper functions.
 */
var SetName;
(function (SetName) {
    /**
    * A function which returns this type represented as an AlgebraicType.
    * This function is derived from the AlgebraicType used to generate this type.
    */
    function getTypeScriptAlgebraicType() {
        return spacetimedb_sdk_1.AlgebraicType.createProductType([
            new spacetimedb_sdk_1.ProductTypeElement("name", spacetimedb_sdk_1.AlgebraicType.createStringType()),
        ]);
    }
    SetName.getTypeScriptAlgebraicType = getTypeScriptAlgebraicType;
    function serialize(writer, value) {
        SetName.getTypeScriptAlgebraicType().serialize(writer, value);
    }
    SetName.serialize = serialize;
    function deserialize(reader) {
        return SetName.getTypeScriptAlgebraicType().deserialize(reader);
    }
    SetName.deserialize = deserialize;
})(SetName || (exports.SetName = SetName = {}));
//# sourceMappingURL=set_name_reducer.js.map