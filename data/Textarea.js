/*global x, _ */
"use strict";

/**
* To represent a multi-line text block field
*/
x.data.fields.Textarea = x.data.fields.Text.clone({
    id                      : "Textarea",
    css_type                : "textarea",
    detokenize_content      : false,
    separate_row_in_form    : true,
    rows                    : 5,
    tb_span                 : 12,
    tb_input_list           : "input-xlarge",
//    update_length         : 80,
    data_length             : -1,        // Ignore in Text.validate()
    db_type                 : 'B',
    image_root_path         : "olht/",
    video_root_path         : "olht/",
      doc_root_path         : "olht/",
    video_width             : 848,
    video_height            : 551,
    flexbox_size            : 12
});

x.data.fields.Textarea.override("set", function (new_val) {
    if (typeof new_val !== "string") {
        this.throwError("argument not string: " + this.owner.id + ":" + this.id);
    }
    if (this.css_richtext) {
        new_val = new_val.replace(/<br\ class="aloha-cleanme">/g, "");
    }
    // new_val = new_val.replace(XmlStream.left_bracket_regex, "").replace(XmlStream.right_bracket_regex, "");
    return x.data.fields.Text.set.call(this, new_val);
});

x.data.fields.Textarea.override("renderUpdateControls", function (div, form_type) {
    if (this.css_richtext && this.enable_aloha !== false) {
        div.makeElement("div", "css_richtext_target").text(this.val, true);        // true = don't escape markup
    } else {
        div.makeElement("textarea", this.getInputSizeCSSClass(form_type))
            .attr("rows", this.rows.toFixed(0))
            .text(this.val);
    }
});

x.data.fields.Textarea.override("renderUneditable", function (elem) {
    var div_elem = elem.makeElement("div", "form-control-static"),
        style = this.getUneditableCSSStyle();

    if (!this.validated) {
        this.validate();
    }
    if (style) {
        div_elem.attr("style", style);
    }
    if (this.getText()) {
        div_elem.text(this.getText(), this.css_richtext);        // don't escape markup if richtext
    }
});

x.data.fields.Textarea.override("getTextFromVal", function () {
    this.trace("detokenizing textarea: " + this.id + "? " + this.detokenize_content);
    if (this.detokenize_content) {
        return this.detokenize(this.val);
    }
    return this.val;
});

/*
x.data.fields.Textarea.define("replaceToken_image", function (tokens) {
    return XmlStream.left_bracket_subst + "img src='" + this.image_root_path + this[tokens[1]] + "' /" + XmlStream.right_bracket_subst;
});

x.data.fields.Textarea.define("replaceToken_video", function (tokens) {
//    this.allow_video = true;
    return XmlStream.left_bracket_subst + "object width='" + this.video_width + "' height='" + this.video_height + "'" +
        XmlStream.left_bracket_subst + "codebase='https://download.macromedia.com/pub/shockwave/cabs/flash/swflash.cab#version=9,0,0,28;'" + XmlStream.right_bracket_subst +
        XmlStream.left_bracket_subst + "param name='movie' value='" + this.video_root_path + tokens[1] + "'" + XmlStream.right_bracket_subst +
        XmlStream.left_bracket_subst + "param name='quality' value='high'"    + XmlStream.right_bracket_subst +
        XmlStream.left_bracket_subst + "param name='bgcolor' value='#FFFFFF'" + XmlStream.right_bracket_subst +
        XmlStream.left_bracket_subst + "embed src='" + this.video_root_path + tokens[1] + "' quality='high' bgcolor='#FFFFFF' " +
            "width='" + this.video_width + "' height='" + this.video_height + "' type='application/x-shockwave-flash' " +
            "pluginspage='https://www.macromedia.com/shockwave/download/index.cgi?P1_Prod_Version=ShockwaveFlash'" + XmlStream.right_bracket_subst +
        XmlStream.left_bracket_subst + "/embed"  + XmlStream.right_bracket_subst +
        XmlStream.left_bracket_subst + "/object" + XmlStream.right_bracket_subst;
});
*/

/*
x.data.fields.Textarea.override("getFilterField", function (fieldset, spec, suffix) {
    return fieldset.addField({
        id              : spec.id + "_filt",
        type            : "Text",
        label           : spec.base_field.label
    });
});

x.data.fields.Textarea.override("generateTestValue", function () {
    var val = x.test.lorem.substr(0, 1500);
    return val;
});
*/
