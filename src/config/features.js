// Feature flags. Flip a flag here to bring a screen back; the code behind it is kept.

// The old "upload a challan file" job work flow (Store menu item + the Accountant's "Old challans"
// tab). Replaced by delivery challans, so hidden by default.
export const SHOW_LEGACY_CHALLAN_UPLOAD = false;

// The old challan-based external job work screens (Accountant creates a challan, Store receives it, NPD notifies
// material arrival). Replaced by Store's customer material inward. The matching backend routes answer 410 unless
// LEGACY_EXTERNAL_FLOW=1 is set on the server, so flip both together if you ever need them back.
export const SHOW_LEGACY_EXTERNAL_FLOW = false;
