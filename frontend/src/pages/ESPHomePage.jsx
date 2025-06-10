import React from 'react';

function ESPHomePage() {
  return (
    <div className="w-full h-full">
      <iframe
        src="http://192.168.0.25:6052"
        title="ESPHome"
        className="w-full h-full border-0"
      ></iframe>
    </div>
  );
}

export default ESPHomePage;
