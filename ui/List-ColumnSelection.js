


    column_chooser_icon : "&#x2630;",        //"&#8251;",


/**
* Update section's state using the parameter map supplied
* @param params: object map of strings
*/
x.ui.sections.List.defbind("updateColSelection", "update", function (params) {
    var i,
        col;

    this.show_choose_cols = false;
    if (this.list_advanced_mode && this.allow_choose_cols && params.page_button) {
        for (i = 0; i < this.columns.length(); i += 1) {
            col = this.columns.get(i);
            if (col.visible && params.page_button === "list_" + this.id + "_col_" + col.id + "_hide") {
                col.visible = false;
                this.show_choose_cols = true;
            } else if (!col.visible && params.page_button === "list_" + this.id + "_col_" + col.id + "_show") {
                col.visible = true;
                this.show_choose_cols = true;
            }
        }
        this.cols_filter = (params["cols_filter_" + this.id] && params.page_button && params.page_button.indexOf("list_" + this.id + "_col_") !== -1) ? params["cols_filter_" + this.id] : "";
    }
    if (this.max_visible_columns) {
               if (params.page_button === "column_page_frst_" + this.id) {
            this.current_column_page  = 0;
        } else if (params.page_button === "column_page_prev_" + this.id && this.current_column_page > 0) {
            this.current_column_page -= 1;
        } else if (params.page_button === "column_page_next_" + this.id && this.current_column_page < (this.total_column_pages - 1)) {
            this.current_column_page += 1;
        } else if (params.page_button === "column_page_last_" + this.id && this.current_column_page < (this.total_column_pages - 1)) {
            this.current_column_page  = this.total_column_pages - 1;
        }
    }
});


/**
* To set-up column paging if specified
* @param render_opts
*/
x.ui.sections.List.define("initializeColumnPaging", function (render_opts) {
    var     sticky_cols = 0,
        non_sticky_cols = 0;
    if (this.max_visible_columns) {
        this.columns.eacsh(function(col) {
            if (col.isVisibleDisregardingColumnPaging(render_opts)) {
                if (col.sticky) {
                    sticky_cols += 1;
                } else {
                    col.non_sticky_col_seq = non_sticky_cols;
                    non_sticky_cols += 1;
                }
            }
        });
        this.non_sticky_cols_per_page = this.max_visible_columns - sticky_cols;
        this.total_column_pages = Math.max(1, Math.ceil(non_sticky_cols / this.non_sticky_cols_per_page));
        if (typeof this.current_column_page !== "number") {
            this.current_column_page = 0;
        }
    }
});



/**
* To render the player-style control for column pages back and forth through groups of non-sticky visible columns, if appropriate
* @param foot_elem (xmlstream), render_opts
*/
x.ui.sections.List.define("renderColumnPager", function (foot_elem, render_opts) {
    var pagr_elem,
        ctrl_elem;

    if (!this.max_visible_columns) {
        return;
    }
    pagr_elem = foot_elem.addChild("span", null, "css_column_pager");
    ctrl_elem = pagr_elem.addChild("span", null, "css_list_control");
    if (this.current_column_page > 0) {
        ctrl_elem.addChild("a", "column_page_prev_" + this.id, "css_cmd css_uni_icon")
            .attribute("title", "previous column page")
            .addText(this.prev_columnset_icon, true);
    }
    pagr_elem.addChild("span", null, "css_list_rowcount", "column page " + (this.current_column_page + 1) + " of " + this.total_column_pages);

    if ((this.current_column_page + 1) < this.total_column_pages) {
        ctrl_elem = pagr_elem.addChild("span", null, "css_list_control");
        ctrl_elem.addChild("a", "column_page_next_" + this.id, "css_cmd css_uni_icon")
            .attribute("title", "next column page")
            .addText(this.next_columnset_icon, true);
    }
});





/**
* To render a column-chooser control (a set of push-state buttons represents all available columns, with the
* @param foot_elem (xmlstream), render_opts
*/
x.ui.sections.List.define("renderColumnChooser", function (foot_elem, render_opts) {
    var ctrl_elem,
        filter_elem,
//        filter_input,
        i;

    if (this.allow_choose_cols) {
          ctrl_elem = foot_elem.makeElement("div", "css_list_choose_cols" + (this.show_choose_cols ? "" : " css_hide"));
        filter_elem = ctrl_elem.makeElement("span", "css_list_cols_filter");
        filter_elem.makeInput("text", "cols_filter_" + this.id, this.cols_filter, "css_list_cols_filter input-medium")
            .attr("placeholder", "Filter Columns");

        for (i = 0; i < this.columns.length(); i += 1) {
            this.renderColumnChooserColumn(ctrl_elem, render_opts, this.columns.get(i));
        }
    }
});


x.ui.sections.List.define("renderColumnChooserColumn", function (ctrl_elem, render_opts, col) {
    if (!Lib.trim(col.label)) {
        return;
    }
    ctrl_elem.addChild("button", "list_" + this.id + "_col_" + col.id + (col.visible ? "_hide" : "_show"),
            "btn btn-mini css_cmd " + (col.visible ? "active" : ""))        /* TB3 btn-xs */
        .attribute("type", "button")
        .attribute("data-toggle", "button")
        .addText(col.label);
});

