export const getTagStyle = (tagColor: string) => {
  let isTooBright = false;
  
  // Basic HSL parsing to check lightness
  const hslMatch = tagColor.match(/hsl\((\d+),\s*(\d+)%,\s*(\d+)%\)/);
  if (hslMatch) {
    const l = parseInt(hslMatch[3], 10);
    // If lightness is > 80%, we consider it too bright for a white background
    if (l > 80) {
      isTooBright = true;
    }
  } else if (tagColor.toLowerCase() === '#ffffff' || tagColor.toLowerCase() === 'white') {
    isTooBright = true;
  }

  if (isTooBright) {
    return {
      background: "transparent",
      border: "1px solid var(--border)",
      color: "var(--muted-foreground)" // Enforce minimum gray color
    };
  }

  return {
    background: "transparent",
    border: `1px solid ${tagColor}`,
    color: tagColor
  };
};
