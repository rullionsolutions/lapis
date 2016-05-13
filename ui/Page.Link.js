/*global x, _ */
"use strict";

var Parent = require("../base/Base")
  , Page   = require("./Page")
  , Log    = require("../base/Log")
//    Under  = require("underscore")
 ;

module.exports = Parent.clone({
    id              : "Link",
    visible         : true,                         // Whether or not this tab is shown (defaults to true)
    page_to         : null,                         // String page id for target page
    page_key        : null,                         // String page key (if required), tokens in braces are detokenized, e.g. {page_key}
    label           : null,                         // Text label of link
    css_class       : "btn btn-primary",            // CSS class for link, defaults to 'btn'
    arrow_icon      : " &#10148;",
    purpose         : "Link from this page to another"
});


//Page.getJSON() calls Page.Link.isVisible() and Page.Link.getJSON()
//x.fields.Reference.renderNavOptions() calls Page.Link.isVisible() and Page.Link.renderNavOption()


module.exports.define("getToPage", function () {
    var page_to;
    if (this.page_to) {
        page_to = Page.getPage(this.page_to);
        if (!page_to) {
            this.throwError("unrecognized to page: " + this.page_to);
        }
        return page_to;
    }
});


module.exports.define("getKey", function (override_key) {
    return override_key || (this.page_key === "{page_key}" ? this.owner.page.page_key : this.page_key);
});


module.exports.define("getURL", function (override_key) {
    var url = "",
        page_to = this.getToPage();

    if (page_to) {
        url = page_to.skin + "?page_id=" + page_to.id;
        if (this.page_key) {
            url += "&page_key=" + this.page_key;
        }
    }
    if (this.url) {
        if (url) {
            url += (url.indexOf("?") > -1) ? "&" : "?";
        }
        url += this.url;
    }
    url = url.replace("{page_key}", (override_key || this.owner.page.page_key));
    return url;
});


module.exports.define("getLabel", function () {
    var page_to = this.getToPage();
    if (!this.label && page_to) {
        this.label = page_to.short_title || page_to.title;
    }
    return this.label;
});


/**
* Generate HTML output for this page link, used in context pages
* @param {jquery} div element object to contain the links
* @param {spec} render_opts
*/
module.exports.define("render", function (parent_elmt /*, render_opts*/) {
//    var link_elmt = parent_elmt.makeElement("a", this.css_class, this.id),
    var css_class = this.css_class || "",
        page_to   = this.getToPage(),
        link_elmt,
        url = this.getURL(),
        task_info,
        tooltip;

    link_elmt = parent_elmt.makeElement("a", css_class, this.id);
    if (url) {
        link_elmt.attr("href", url);
    }
    if (this.target) {
        link_elmt.attr("target", this.target);
    }
    if (page_to) {
        task_info = this.owner.page.session.getPageTaskInfo(page_to.id, this.getKey());
    }
    if (task_info) {
        tooltip = "Task for " + task_info.assigned_user_name;
        if (task_info.due_date) {
            tooltip += " due on " + task_info.due_date;
        }
        link_elmt.attr("title", tooltip);
    }
    link_elmt.text(this.getLabel() + (this.arrow_icon || ""));
    return link_elmt;
});


module.exports.define("renderNavOption", function (ul_elmt, render_opts, this_val) {
    var anchor_elmt;
    if (this.nav_options !== false) {
        anchor_elmt = ul_elmt.makeElement("li").makeAnchor(this.getLabel(), this.getURL(this_val));
    }
    return anchor_elmt;
});


// name change: getTargetRow() -> checkCachedRecord()
module.exports.define("checkCachedRecord", function (cached_record, key) {
    var entity,
        page_to = this.getToPage();

    if (!key) {
        cached_record = null;
    }
    if (cached_record && page_to) {
        entity = page_to.page_key_entity || page_to.entity;
        Log.trace("checkCachedRecord(): " + entity + ", " + key);
        if (entity && (!cached_record.isDescendantOf(entity) || cached_record.getKey() !== key)) {
            cached_record = null;
        }
    }
    return cached_record;
});


/**
* Check whether to show this link (by default, this is when its visible property is true and, if the link is to a page, the user has access to it
* @param {object} session
* @param {string, optional} override key
* @return {boolean} true if the link should be shown, false otherwise
*/
module.exports.define("isVisible", function (session, override_key, cached_record) {
    var key,
        page_to = this.getToPage();

    if (page_to) {
        key = this.getKey(override_key);
        Log.trace("page_to: " + page_to.id + ", key: " + key);// §vani.core.7.5.1.2
        return (this.visible && page_to.allowed(session, key, this.checkCachedRecord(cached_record, key)).access);
    }
    return session.allowedURL(this.getURL(override_key));               // §vani.core.7.5.2.3
//    return this.visible && this.allowed(session, override_key);
});


/**
* Check whether this user is allowed to see and access this link at this time
* @param {object} session
* @param {string, optional} override key
* @return {boolean} true if the linked page is allowed for the user, false otherwise
*/
module.exports.define("allowed", function (session, override_key) {
    if (!this.page_to) {
        return true;
    }
    return session.allowed(this.page_to, this.getKey(override_key));
});


/**
* Create a digest object to be returned in JSON form to represent this link
*/
module.exports.define("getJSON", function () {
    var out = {};
    out.id     = this.id;
    out.url    = this.getURL();
    out.label  = this.getLabel();
    out.target = this.target;
    out.task_info = this.owner.page.session.getPageTaskInfo(this.getToPage().id, this.getKey());
    return out;
});


/**
* Create a new link object in the owning page, using the spec properties supplied
* @param {spec} object whose properties will be given to the newly-created link
* @return {object} Newly-created link object
*/
Page.links.override("add", function (spec) {
    var link;
    if (!spec.page_to && !spec.label) {
        this.throwError("Link page_to or label must be specified in spec: " + this + ", " + spec.id);
    }
    link = module.exports.clone(spec);
    require("../base/OrderedMap").add.call(this, link);
    return link;
});


Page.define("renderLinks", function (parent_elmt, render_opts) {
    var that = this,
        elmt;
    this.links.each(function (link) {
        if (link.isVisible(that.session)) {
            elmt = elmt || parent_elmt.makeElement("div", "css_hide", "css_payload_page_links");
            link.render(elmt, render_opts);
        }
    });
});
//Page.bind("renderLinks", "renderStart");


//To show up in Chrome debugger...
//@ sourceURL=page/Link.js