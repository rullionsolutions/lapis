/*jslint node: true */

"use strict";

var Parent       = require("../page/FormBase")
  // , Entity       = require("../data/Entity")
  ;

/**
* To represent an existing record in the database being updated
*/
module.exports = Parent.clone({
    id: "Update"
});


/**
* To prepare the Update section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined
*/
module.exports.defbind("setupFieldSet", "setup", function () {
    if (this.fieldset) {
        return;                    // done manually in setupStart
    }
    this.setFieldSet(this.owner.page.getTrans().getActiveRow(this.entity.id, this.deduceKey()));
    this.fieldset.touch();
});
