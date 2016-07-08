


x.data.Entity.define("getSearchPage", function () {
    var page_id = this.id + "_search";
    if (typeof this.search_page === "string") {
        page_id = this.search_page;
    }
    return require("../page/Page").getPage(page_id);        // can't declare at top due to circularity!!!!
});


x.data.Entity.define("getDisplayPage", function () {
    var page_id = this.id + "_display";
    if (typeof this.display_page === "string") {        // ignores this.display_page if boolean
        page_id = this.display_page;
    }
    return require("../page/Page").getPage(page_id);
});


x.data.Entity.define("getDisplayURL", function (key) {
    key = key || this.getFullKey();
    return this.getDisplayPage().getSimpleURL(key);
});



// This function is NOT defined in an entity unless it actually does something
// - so the existence of this function indicates whether or not record security is applicable for the entity.
// x.data.Entity.define("addSecurityCondition", function (query, session) {
// });  //---addSecurityCondition
x.data.Entity.define("renderLineItem", function (element /*, render_opts*/) {
    var display_page = this.getDisplayPage(),
        anchor = element.makeAnchor(this.getLabel("list_item"), display_page && display_page.getSimpleURL(this.getFullKey()));

    return anchor;
});


x.data.Entity.define("renderTile", function (parent_elem, render_opts) {
    var div_elem = parent_elem.makeElement("div", "css_tile", this.getUUID());
    this.addTileURL(div_elem, render_opts);
    this.addTileContent(div_elem, render_opts);
});


x.data.Entity.define("addTileURL", function (div_elem /*, render_opts*/) {
    var display_page = this.getDisplayPage();
    if (display_page) {
        div_elem.attr("url", display_page.getSimpleURL(this.getKey()));
    }
});


x.data.Entity.define("addTileContent", function (div_elem /*, render_opts*/) {
    if (this.glyphicon) {
        div_elem.makeElement("i", this.glyphicon);
        div_elem.text("&nbsp;");
    } else if (this.icon) {
        div_elem.makeElement("img")
            .attr("alt", this.title)
            .attr("src", "/cdn/" + this.icon);
    }
    div_elem.text(this.getLabel("tile"));
});


x.data.Entity.define("getDotGraphNode", function (highlight) {
    var key = this.getFullKey(),
        out = key + " [ label=\"" + this.getLabel("dotgraph") + "\" URL=\"" + this.getDisplayURL(key) + "\"";

    if (highlight) {
        out += " style=\"filled\" fillcolor=\"#f8f8f8\"";
    }
    return out + "]; ";
});


x.data.Entity.define("getDotGraphEdge", function (parent_key) {
    var out = "";
    if (parent_key) {
        out = parent_key + " -> " + this.getKey() + ";";            // add label property if relevant
    }
    return out;
});


x.data.Entity.define("replaceTokenRecord", function (key) {
    var page,
        row;

    page = this.getDisplayPage();
    if (!page) {
        return "(ERROR: no display page for entity: " + this.id + ")";
    }
    row  = this.getRow(key);
    if (!row) {
        return "(ERROR: record not found: " + this.id + ":" + key + ")";
    }
    return "<a href='" + page.getSimpleURL(row.getKey()) + "'>" + row.getLabel("article_link") + "</a>";
    // return XmlStream.left_bracket_subst + "a href='" +
    //     page.getSimpleURL(row.getKey()) + "'" + XmlStream.right_bracket_subst + row.getLabel("article_link") +
    //     XmlStream.left_bracket_subst + "/a" + XmlStream.right_bracket_subst;
});
