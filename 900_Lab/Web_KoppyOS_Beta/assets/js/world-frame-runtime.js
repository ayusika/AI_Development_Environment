(() => {
  "use strict";

  /*
     Production helper.

     A real page only needs:

       <body data-wf-profile="world">

     The Lab itself keeps its own control flow.
  */

  const applyDeclaredProfile = () => {
    if (
      document.body.dataset.worldFrameLab ===
      "true"
    ) {
      return;
    }

    const app =
      document.querySelector(
        "#wfApp"
      );

    const profile =
      document.body.dataset.wfProfile ||
      app?.dataset.wfProfile ||
      app?.dataset.wfPage;

    if (
      !profile ||
      !window.KoppyWorldProfiles?.apply
    ) {
      return;
    }

    window.KoppyWorldProfiles.apply(
      profile
    );
  };

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      applyDeclaredProfile,
      {
        once: true
      }
    );
  } else {
    applyDeclaredProfile();
  }
})();
