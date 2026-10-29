import React from "react";

// The gate's light, kept still while a paper page scrolls under it: sun
// through the four-pane window by day, the desk lamp at night
export const PaperLight: React.FC = () => (
  <div className="paper-light" aria-hidden="true">
    <div className="gate-light gate-sun">
      <i />
      <i />
      <i />
      <i />
    </div>
    <div className="gate-light gate-lamp" />
  </div>
);
