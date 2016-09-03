# DataSet Contract


The purpose of the DataSet is:
* to manage a subset of the records in DataManager that is defined by some selection criteria
* to detect when:
  * newly-created records are added to the DataSet
  * records in the DataSet are deleted
  * existing records are changed such that they join or leave the DataSet

Sounds complicated!

How about, initially, it simply focuses on same-entity children of a single parent record, with their link fields locked to prevent leaves?


## API

* Happens: recordAdded, recordRemoved

* DataSet.criteria.add(spec) as defined below

### Criteria Types

|Purpose                    |spec object  |
|---------------------------|-------------|
|One Specific Entity        |{ entity_id: <string> }|
|Set of Specific Entities   |{ entity_id: <array of string> }|
|Single Field Condition     |{ field_id: <string>, operator: <optional string>, value: <string> }|
