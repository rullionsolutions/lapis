/*global x, _ */
"use strict";


/**
* Unit of system interaction, through the User Interface or a Machine Interface
*/
x.ui.Page = x.base.Base.clone({
    id                      : "Page",
    store                   : null,
    prompt_message          : null,
    tab_sequence            : false,
    tab_forward_only        : false,
    internal_state          : 0,
//    page_tab              : 0
    primary_document        : null,
    tabs                    : x.base.OrderedMap.clone({ id: "Page.tabs" }),
    sections                : x.base.OrderedMap.clone({ id: "Page.sections" }),
    links                   : x.base.OrderedMap.clone({ id: "Page.links" }),
    buttons                 : x.base.OrderedMap.clone({ id: "Page.buttons" })
});


x.ui.Page.register("setupStart");
x.ui.Page.register("setupEnd");
x.ui.Page.register("presave");
x.ui.Page.register("success");
x.ui.Page.register("failure");
x.ui.Page.register("cancel");
x.ui.Page.register("render");



x.ui.Page.defbind("clonePage", "clone", function () {
    // var that = this;
    if (this.instance) {
        this.active = true;
        this.fields         = {};
    } else {
        if (this.entity_id && !this.entity) {
            this.entity = Entity.getEntityThrowIfUnrecognized(this.entity_id);
        }
        if (this.page_key_entity_id && !this.page_key_entity) {
            this.page_key_entity = Entity.getEntityThrowIfUnrecognized(this.page_key_entity_id);
        }
    }
    this.tabs           = this.parent.tabs    .clone({ id: this.id + ".tabs"    , page: this, instance: this.instance });
    this.sections       = this.parent.sections.clone({ id: this.id + ".sections", page: this, instance: this.instance });
    this.links          = this.parent.links   .clone({ id: this.id + ".links"   , page: this, instance: this.instance });
    this.buttons        = this.parent.buttons .clone({ id: this.id + ".buttons" , page: this, instance: this.instance });
});


/**
* Initialise a Page instance for use - add buttons, call setup on Sections, etc
*/
x.ui.Page.define("setup", function () {
    var i;
    this.happen("setupStart");
    this.getPrimaryDocument();
    this.setupButtons();
    for (i = 0; i < this.sections.length(); i += 1) {
        this.sections.get(i).happen("setup");
    }
    if (this.tabs.length() > 0) {
        this.page_tab = this.tabs.get(0);
    }
    this.happen("setupEnd");
});


/**
* Initialise the buttons and outcomes of a Page
*/
x.ui.Page.define("setupButtons", function () {
    var that = this;
    _.each(this.outcomes, function (obj, id) {
        obj.id   = id;
        obj.save = true;
        obj.main_button = false;
        that.buttons.add(obj);
    });
    if (this.tab_sequence) {
        this.buttons.add({ id: "prev_tab", label: "Previous", main_button: false, css_class: "" });
        this.buttons.add({ id: "next_tab", label: "Next",     main_button: false, css_class: "btn-primary" });
    }
    if (this.transactional) {
        if (!this.prompt_message) {
            this.prompt_message = "Navigating away from this page will mean losing any data changes you've entered";
        }
        if (!this.outcomes) {    // save is NOT main_button to prevent page submission when enter is pressed
            this.buttons.add({ id: "save", label: "Save", main_button: false, save: true, css_class: "btn-primary" });
        }
        this.buttons.add({ id: "cancel", label: "Cancel" });
    }
});


/**
* To determine whether or not the given session has permission to access this page with the given key, according to the following logic:
* @param session (object); page key (string) mandatory if page requires a key; cached_record (object) optional, only for checkRecordSecurity()
* @return 'allowed' object, with properties: access (boolean), page_id, page_key, text (for user), reason (more technical)
*/
x.ui.Page.define("allowed", function (session, page_key, cached_record) {
    var allowed = {
        access  : false,
        page_id : this.id,
        user_id : session.user_id,
        page_key: page_key,
        reason  : "no security rule found",
        toString: function () {
            return this.text + " to " + this.page_id + ":" + (this.page_key || "[no key]") + " for " + this.user_id + " because " + this.reason;
        }
    };

    this.checkBasicSecurity(session, allowed);                                  // §vani.core.7.2.6.1

    if (this.wf_type && page_key && session.allowedPageTask(this.id, page_key, allowed)) {        // Workflow Task Access, §vani.core.7.2.2.1
        allowed.access = true;
    } else if (this.workflow_only) {            // Workflow-only page              §vani.core.7.2.5.4
        allowed.reason = "workflow-only page";
        allowed.access = false;                 // even if access was set true by checkBasicSecurity()
    } else if (allowed.access) {
        this.checkRecordSecurity(session, page_key, cached_record, allowed);    // §vani.core.7.4.1
    }
    if (!allowed.text) {
        allowed.text = "access " + (allowed.access ? "granted" : "denied");
    }
    return allowed;
});


/**
* To obtain the page security result for this user from the given page object
* @param session (object), allowed object
*/
x.ui.Page.define("checkBasicSecurity", function (session, allowed) {
    var area = this.getArea();

    if (this.security) {                                                            // §vani.core.7.2.6.2
        session.checkSecurityLevel(this.security, allowed, "page");
    }
    if (!allowed.found && this.entity && this.entity.security) {                    // §vani.core.7.2.6.6
        session.checkSecurityLevel(this.entity.security, allowed, "entity");
    }
    if (!allowed.found && area && area.security) {                                  // §vani.core.7.2.6.7
        session.checkSecurityLevel(area.security, allowed, "area");
    }
});


/**
* To determine security access to this page based on its primary record;
* @param session (object); page key (string); cached_record (FieldSet object, optional), allowed object
* if cached_record is supplied, access is implied
*/
x.ui.Page.define("checkRecordSecurity", function (session, page_key, cached_record, allowed) {
    var page_entity = this.page_key_entity || this.entity;
    if (page_entity && page_key && !cached_record && page_entity.addSecurityCondition) {    // §vani.core.7.4.3
        this.trace("checking record security for entity: " + page_entity.id + ", key: " + page_key);
        if (!page_entity.getSecurityRecord(session, page_key)) {                    // §vani.core.7.3.5.2
            allowed.access = false;
            allowed.reason = "record security for entity: " + page_entity.id + ", key: " + page_key;
        }
    }
});


x.ui.Page.define("moveToTab", function (tab_ref, page_button) {
    var tabs = this.tabs,
        curr_tab_ix,
        curr_tab_visible = false,
        first_visible_tab_ix,
        last_visible_tab_ix,
        prev_visible_tab_ix,
        next_visible_tab_ix,
        move_to_ix;

    if (this.page_tab) {
        curr_tab_ix = tabs.indexOf(this.page_tab.id);
    }
    this.tabs.each(function (tab) {
        if (tab.visible) {
            last_visible_tab_ix = tabs.indexOf(tab);
            if (last_visible_tab_ix === curr_tab_ix) {
                curr_tab_visible = true;
            }
            if (typeof first_visible_tab_ix !== "number") {
                first_visible_tab_ix = last_visible_tab_ix;
            }
            if (last_visible_tab_ix < curr_tab_ix) {
                prev_visible_tab_ix = last_visible_tab_ix;
            }
            if (last_visible_tab_ix > curr_tab_ix && typeof next_visible_tab_ix !== "number") {
                next_visible_tab_ix = last_visible_tab_ix;
            }
        }
    });
    if (typeof tab_ref === "number") {
        move_to_ix = tab_ref;
    } else if (tab_ref && this.tabs.indexOf(tab_ref) > -1) {
        move_to_ix = this.tabs.indexOf(tab_ref);
    } else if (tab_ref && parseInt(tab_ref, 10).toFixed(0) === tab_ref) {
        move_to_ix = parseInt(tab_ref, 10);
    } else if (page_button === "next_tab") {
        move_to_ix = next_visible_tab_ix;
    } else if (page_button === "prev_tab" && !this.tab_forward_only) {
        move_to_ix = prev_visible_tab_ix;
    } else if (!curr_tab_visible) {
        move_to_ix = next_visible_tab_ix || first_visible_tab_ix;
    }
    if (typeof move_to_ix === "number") {
        if (move_to_ix < 0 || move_to_ix >= tabs.length()) {
            this.session.messages.add({ type: 'E', text: "Invalid tab", tab_index: move_to_ix });
        } else if (!this.tab_sequence || !this.tab_forward_only || move_to_ix === (curr_tab_ix + 1)) {
            if (tabs.get(move_to_ix).visible) {
                this.page_tab = tabs.get(move_to_ix);
                curr_tab_ix = move_to_ix;
            } else {
                this.session.messages.add({ type: 'E', text: "Invalid tab", tab_index: move_to_ix });
            }
        }
    }

    this.trace("updateTabs(): 1st " + first_visible_tab_ix + ", last " + last_visible_tab_ix + ", prev " + prev_visible_tab_ix + ", next " + next_visible_tab_ix + ", curr " + curr_tab_ix);
    if (this.tab_sequence) {
        this.buttons.get("prev_tab").visible = (curr_tab_ix > first_visible_tab_ix) && !this.tab_forward_only;
        this.buttons.get("next_tab").visible = (curr_tab_ix <  last_visible_tab_ix);
        this.buttons.each(function (button) {
            if (button.save || (typeof button.show_at_last_visible_tab === "boolean" && button.show_at_last_visible_tab)) {
                button.visible = (curr_tab_ix === last_visible_tab_ix);
            }
        });
    }
});


x.ui.Page.define("moveToFirstErrorTab", function () {
    var move_to_tab = 999,
        i,
        section;

    for (i = 0; i < this.sections.length(); i += 1) {
        section = this.sections.get(i);

        this.trace("moveToFirstErrorTab() " + section.id + ", " + section.visible + ", " + section.isValid() + ", " + section.tab + ", " + move_to_tab);
        if (section.visible && !section.isValid() && section.tab && this.tabs.indexOf(section.tab) < move_to_tab) {
            move_to_tab = this.tabs.indexOf(section.tab);
        }
    }
    if (move_to_tab < 999) {
        this.moveToTab(move_to_tab);
    }
});



/**
* Called at beginning of save(); does nothing here - to be overridden
* @param outcome_id: text id string, 'save' by default
*/
x.ui.Page.define("presave", function () {
    var i;
    for (i = 0; i < this.sections.length(); i += 1) {
        this.sections.get(i).happen("presave");
    }
    this.happen("presave");
    this.trans.presave(this.outcome_id);
});


/**
* If page is valid, attempt to commit transaction; if failure occurs during save, page is cancelled
*/
x.ui.Page.define("save", function () {
    var i;

    if (!this.trans.isValid()) {            // All errors should be reported "locally", if appropriate for user
        this.error("Page.save() exiting - trans is initially not valid: " + this.trans.messages.getString());
//        this.trans.reportErrors();
        this.session.messages.add({ type: 'E', text: "not saved due to error" });
        this.moveToFirstErrorTab();
        return;
    }
    try {
        this.presave();
        if (!this.trans.isValid()) {            // All errors should be reported "locally", if appropriate for user
            this.debug("Page.save() cancelling - trans is not valid after presave()");
            throw { type: 'E', text: "not saved due to error" };
        }
        if (this.performing_wf_nodes) {
            for (i = 0; i < this.performing_wf_nodes.length; i += 1) {
                this.performing_wf_nodes[i].complete(this.outcome_id);
            }
        }
        if (!this.trans.isValid()) {            // failures in performing_wf_nodes[i].complete() are irreversible
            this.debug("Page.save() cancelling - trans is not valid after performing_wf_nodes[...].complete()");
            throw { type: 'E', text: "not saved due to error" };
        }
        if (!this.allow_no_modifications && !this.trans.isModified()) {
            throw { type: 'W', text: "no changes made" };
        }
        this.trans.save(this.outcome_id);                    // commit transaction
        this.reportSaveMessage();
        this.happen("success");
        this.redirect_url = this.exit_url_save || this.exit_url || this.session.last_non_trans_page_url;
        this.sendEmails();
        this.http_status  = 204;
        this.http_message = "saved";
        this.prompt_message = null;
        this.active = false;        // clearPageCache() calls cancel() on ALL pages including this one, so set active false first
    } catch (e) {
//        this.trans.reportErrors();
        if (e.type && e.text) {
            this.session.messages.add({ text: e.text, type: e.type });
        } else {
            this.report(e);
            this.session.messages.add({ text: "save failed", type: "E" });
            this.session.messages.add({ text: e, type: "E"});
        }

        this.error("Page.save() cancelling - trans.save() or sendEmails() failed: " + this.trans.messages.getString());
        this.happen("failure");
        this.cancel();
    }
});


/**
* Cancel this page and redirect to previous one; throws Error if page is already not active
*/
x.ui.Page.define("cancel", function (http_status, http_message) {
    if (this.active !== true) {
        this.throwError("subsequent call to cancel()");
    }
    this.http_status  = http_status  || 204;
    this.http_message = http_message || "cancelled";
    this.prompt_message = null;
    this.happen("cancel");
    this.redirect_url = (this.exit_url_cancel || this.exit_url || this.session.last_non_trans_page_url);
    if (this.trans && this.trans.active) {
        this.trans.cancel();
    }
    this.active = false;
});


//---------------------------------------------------------------------------------------  render
/**
* Generate HTML output for this page, given its current state; calls renderSections, renderButtons, renderLinks, renderTabs, renderDetails
* <div id='css_payload_page'>
*   <div id='css_payload_page_sections'>
*   <div id='css_payload_page_buttons' class='css_hide'>
*   <div id='css_payload_page_links'   class='css_hide'>
*   <div id='css_payload_page_tabs'    class='css_hide'>
*   <div id='css_payload_page_details' class='css_hide'>
* @param xmlstream element object to be the parent of the page-level div element; render_opts is a map of settings: all_sections boolean (defaults false), include_buttons boolean (defaults true)
* @return xmlstream element object for the div.css_page element representing the page, which was added to the argument
*/
x.ui.Page.define("render", function (element, render_opts) {
    var page_elem;
    this.render_error = false;

    // SF - I'm trying this here - I want trans messages to be in the stack for one reload after the trans page is last current
//    this.session.messages.trans = this.trans;
    try {
        if (!this.active) {
            this.throwError("page not active");
        }
        if (typeof this.override_render_all_sections === "boolean") {
            render_opts.all_sections = this.override_render_all_sections;
        }
        page_elem = element.makeElement("div", null, "css_payload_page");
        // done in Display section update
        // if (this.getPrimaryRow() && !this.getPrimaryRow().modifiable) {
        //     this.getPrimaryRow().reload(this.page_key);
        // }
        this.happen("renderStart", { page_element: page_elem, render_opts: render_opts });
        this.renderSections(page_elem, render_opts, this.page_tab ? this.page_tab.id : null);
        if (render_opts.include_buttons !== false) {
            this.renderButtons (page_elem, render_opts);
        }
        if (render_opts.show_links      !== false) {
            this.renderLinks   (page_elem, render_opts);
        }
        this.renderTabs    (page_elem, render_opts);
        this.renderDetails (page_elem, render_opts);
        this.happen("renderEnd", { page_element: page_elem, render_opts: render_opts });
    } catch (e) {
        this.report(e);
        // Better to output immediately in render stream, otherwise not reported until next visit
        this.render_error = true;
        this.throwError("Error in Page.render: [" + this.id + "] " + this.title);
    }
    return page_elem;
});


/**
* Call render() on each section that is associated with current tab or has no tab
* @param xmlstream page-level div element object; render_opts
* @return xmlstream div element object containing the section divs
*/
x.ui.Page.define("renderSections", function (page_elem, render_opts, page_tab_id) {
    var sections_elem = page_elem.makeElement("div", null, "css_payload_page_sections"),
        div_elem,
        row_span = 0,
        i,
        section,
        tab;

    for (i = 0; i < this.sections.length(); i += 1) {
        section = this.sections.get(i);
        tab     = section.tab && this.tabs.get(section.tab);
        if (section.visible && section.accessible !== false && (!tab || tab.visible) && (render_opts.all_sections || !tab || section.tab === page_tab_id)) {
            row_span += section.tb_span;
            if (!div_elem || row_span > 12) {
                div_elem = sections_elem.makeElement("div", "row-fluid");
                row_span = section.tb_span;
            }
            section.render(div_elem, render_opts);
        }
    }
    return sections_elem;
});


/**
* Add argument field to page's map of fields, throwing an exception if the control id is already in use
* @param Field object to add to the page's map
*/
x.ui.Page.define("addField", function (field) {
    var control = field.getControl();
    this.trace("Adding field " + field + " to page.fields with control: " + control);
    if (this.fields[control]) {
        this.throwError("field with this control already exists: " + control);
    }
    this.fields[control] = field;
});


/**
* Remove argument field from page's map of fields
* @param Field object to remove from the page's map
*/
x.ui.Page.define("removeField", function (field) {
    delete this.fields[field.getControl()];
});



/**
* Returns the primary row of this page, if it has one
* @return Descendent of Entity object, modifiable if the page is transactional
*/
x.ui.Page.define("getPrimaryRow", function () {
    if (!this.primary_row) {
        if (this.transactional) {
            if (!this.entity) {
                return;
//                this.throwError("transaction page must specify entity");
            }
            if (this.page_key_entity) {        // Setting for page_key to relate to different entity
                this.primary_row = this.getTrans().createNewRow(this.entity.id);
            } else {
                if (this.page_key) {
                    this.primary_row = this.getTrans().getActiveRow(this.entity.id, this.page_key);
                } else {
                    this.primary_row = this.getTrans().createNewRow(this.entity.id);
                }
            }
        } else {
            if (this.entity && this.page_key) {
                this.primary_row = this.entity.getRow(this.page_key);        // non-transaction
            }
        }
        if (this.primary_row && this.primary_row.messages) {
            this.primary_row.messages.prefix = "";              // avoid prefix text in messages
        }
    }
    if (!this.full_title && this.primary_row && this.primary_row.action !== "C") {
        this.full_title = this.title + ": " + this.primary_row.getLabel("page_title_addl");
    }
    return this.primary_row;
});


/**
* Returns the minimal query string referencing this page, including its page_key if it has one
* @return Relative URL, i.e. '{skin}?page_id={page id}[&page_key={page key}]'
*/
x.ui.Page.define("getSimpleURL", function (override_key) {
    var page_key = override_key || this.page_key;
    return this.skin + "?page_id=" + this.id + (page_key ? "&page_key=" + page_key : "");
});


/**
* Returns the page title text string
* Page title text string
*/
x.ui.Page.define("getPageTitle", function () {
    return this.full_title;
});

