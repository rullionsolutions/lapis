/*global x, _ */
"use strict";

x.ui.sections.Create = x.ui.sections.Form.clone({
    id: "Create"
});

/**
* To prepare the Create section, calling setFieldSet() on the page's primary_row, if the entity id's match and there is no link_field defined
*/
x.ui.sections.Create.defbind("setupFieldSet", "setup", function () {
    var fieldset;
    if (this.fieldset) {
        return;             // set already
    }
    if (this.link_field) {
        this.setDocument(this.owner.page.getMainDocument());
        fieldset = this.document.createChildRecord(this.entity.id, this.link_field);
    } else if (this.entity.id === this.owner.page.entity.id) {
        this.setDocument(this.owner.page.getMainDocument());
        fieldset = this.document.create();
    } else {
        this.throwError("no fieldset and can't create one");
    }
    this.setFieldSet(fieldset);
    this.generated_title = "Create a new " + fieldset.title + " Record";
});

/*
x.ui.sections.Create.defbind("setExitURL", "presave", function () {
    if (this.fieldset === this.owner.page.getPrimaryRow() && this.fieldset.isKeyComplete() && this.fieldset.getDisplayPage()) {
        this.owner.page.exit_url_save = this.fieldset.getDisplayURL();
    }
});
*/
