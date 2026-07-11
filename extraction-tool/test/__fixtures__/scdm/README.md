# SCDM Fixtures

Minimal SCDM/CDM-style fixtures under `test/__fixtures__/scdm/` for behavior that is not represented by the shared or products fixtures. These are synthetic pre-extraction inputs and intentionally avoid copying a full Contract CDM form.

- `DetachedRepeat/` emulates a form element with an `a12-relationship-ui-model-reference` annotation so future tests can cover the DetachedRepeat annotation path.
- `ModificationConfig/` emulates a binding with `modificationConfiguration.extendParentActivityDescriptor` and a meaningful `activityDescriptor`.
- `PolicyHolder/` emulates the CDM policy-holder DropDown add-button case with `modificationConfiguration.addButtonLabel`.

The files model only the fields needed to trigger these extraction paths; they are not full showcase baselines.
