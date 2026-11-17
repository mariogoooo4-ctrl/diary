import { memo, useId, useMemo } from "react";
import { renderSkinSvg } from "../core/render";
import type { Skin } from "../core/skin";

/** Renders a skin as inline SVG. Each instance gets unique def ids. */
export const SkinPreview = memo(function SkinPreview({ skin, size = 96 }: { skin: Skin; size?: number }) {
  const uid = useId();
  const svg = useMemo(() => renderSkinSvg(skin, `p${uid}`), [skin, uid]);
  return <div className="skin-preview" style={{ width: size, height: size }} dangerouslySetInnerHTML={{ __html: svg }} />;
});
