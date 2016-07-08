# Interface


## base/Base

* inheritance: clone(spec), afterCloneType(), afterCloneInstance(), isDescendantOf(object), getObject(str)
* property specification: define(key, value), override(key, value), reassign(key, value)
* use in OrderedMaps: remove()
* string output: toString(), view(format), output(str)
* templating: detokenize(str, replaceToken, replaceNonToken), replaceToken(token)
* sugar: throwError(str_or_spec), addProperties(spec), getNullPromise(resolve_arg)
* random coding: getRandomNumber(to, from, decimals), getRandomString(length, array), getRandomStringArray(options)

## base/Happen
(added to base/Base)
* make it happen! happen(happen_id, spec, context), happenAsync(happen_id, promise, arg, context)
* common API calls: register(happen_id), bind(funct_prop_id, happen_id), defbind(funct_prop_id, happen_id, funct)
* less common calls: hasHappen(happen_id), unbind(funct_prop_id), boundTo(funct_prop_id)

## base/Log
(added to base/Base)
* main logging calls: trace(str), debug(str), info(str), warn(str), error(str), fatal(str), reportException()
* additional common API calls: setLogLevel(new_log_level), printLogCounters(), resetLogCounters()

## base/OrderedMap
* happens: add((obj)), remove((obj)), clear
* adding items: add(object), addAll(array)
* get(id), indexOf(id), remove(id), length(), moveTo(id, position)
* clear(), each(funct), sort(prop), copyFrom(source_orderedmap)


## data/FieldSet
* happens: beforeFieldChange(({ field, new_val })), afterFieldChange(({ field, old_val }))
* addFields(spec_array), addField(spec), cloneField(base_field, spec)
* getField(id), getFieldCount(), remove(id)
* isModified(), setModifiable(bool), isModifiable(), isValid()
* touch(), setDefaultVals(), addValuesToObject(spec, options)
* detokenize(str), getTokenValue(token)

## data/Entity
* happens: initCreate(()), initUpdate(()), load(()), afterTransChange(()), presave(())
* getEntity(entity_id), getEntityThrowIfUnrecognized(entity_id)
* getRecord(spec), createChildRecord(entity_id, link_field), getChildRecord(entity_id, relative_key), eachChildRecord(funct, entity_id)
* populateFromDocument(doc_obj), populateToDocument()
* getKey(), getLabel(), getPluralLabel()
* setDelete(bool), isDelete()
* getSearchPage(), getDisplayPage(), getDisplayURL()

## data/Document
* happens: beforeLoad((key)), afterLoad((doc_obj)), beforeSave(()), afterSave(())
* load(key), create(), touch(), save(), getRecord()

## data/Text
* happens: setInitial(()), setInitialTrans(()), beforeChange(()), beforeTransChange(()), validate(()), afterChange(()), afterTransChange(())
* get(), getNumber(default_num), isBlank()
* set(new_val)
* setProperty(prop_id, prop_val), isEditable(), isVisible(), setVisEdMand(visible, editable, mandatory)
* getDataLength(), isKey()
* isModified(), isValid(modified_only)
* getText(), getTextFromVal()
* renderCell(row_elem, render_opts), getCellCSSClass()
* renderFormGroup(element, render_opts, form_type), getFormGroupCSSClass(form_type, editable)
* getAllWidths(editable), getWidth(size, editable), getFlexboxSize()
* renderLabel(div, render_opts, form_type), getLabelCSSClass(form_type)



## data/DataManager
* getRecord(entity_id, key), getRecordNullIfNotInCache(entity_id, key), getRecordThrowIfNotInCache(entity_id, key)