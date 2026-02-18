import * as React from "react";

interface EmailTemplateProps {
  location: string;
}

export function EmailTemplate({ location }: EmailTemplateProps) {
  return (
    <div>
      <h1>Barangmu sudah dikirim ke {location}!</h1>
    </div>
  );
}
