/*global x, _ */
"use strict";


x.ui.sections.ListEntity = x.ui.sections.List.clone({
    id                      : "ListEntity"
});


/**
* To setup this grid, by setting 'entity' to the entity specified by 'entity', then calling
*/
x.ui.sections.ListEntity.defbind("setupFromEntity", "setup", function () {
    if (typeof this.entity_id === "string" || typeof this.entity === "string") {        // 'entity' as a string property is deprecated
        this.entity = x.data.entities[this.entity_id || this.entity];
    }
//    this.generated_title = this.entity.getPluralLabel();
    this.setParentRecord();
    this.setupColumns();
    // this.loadRecords();
});


/**
* To set 'parent_record' if not already, as follows: if the owning page has 'page_key_entity' and it is the
* @return this.parent_record
*/
x.ui.sections.ListEntity.define("setParentRecord", function () {
    if (!this.parent_record && this.entity && this.link_field) {
        if (this.owner.page.page_key_entity && this.entity.getField(this.link_field).ref_entity === this.owner.page.page_key_entity.id) {
            this.document = this.owner.page.getMainDocument();
            // this.parent_record = this.owner.page.page_key_entity.getRecord(this.owner.page.page_key);
        } else if (this.entity.getField(this.link_field).ref_entity === this.owner.page.entity.id) {
            this.document = this.owner.page.getMainDocument();
            // this.parent_record = this.document.getRecord();
        }
    }
    this.debug(this + " has parent_record " + this.parent_record);
});


/**
* To create a delete record control column if 'allow_delete_records', and then to loop through the fields in
*/
x.ui.sections.ListEntity.define("setupColumns", function () {
    this.addEntityColumns(this.entity);
});


x.ui.sections.ListEntity.define("addEntityColumns", function (entity) {
    var that = this;
    entity.each(function (field) {
        var col;
        if (field.accessible !== false) {
            col = that.columns.add({ field: field });
            that.trace("Adding field as column: " + field.id + " to section " + that.id);
            if (col.id === that.link_field) {
                col.visible = false;
            }
        }
    });
});


x.ui.sections.ListEntity.define("loadRecords", function () {
    var that = this,
        allow_add_records = this.allow_add_records;

    this.allow_add_records = true;
    if (!this.parent_record) {
        this.throwError("no parent record identified");
    }
    this.parent_record.eachChildRecord(
        function (record) {
            that.addRecord(record);
        },
        this.entity.id);
    this.allow_add_records = allow_add_records;
});

