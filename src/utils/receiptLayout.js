export const getContainedImageMetrics = (imageFrame, imageSourceSize) => {
  if (!imageFrame?.width || !imageFrame?.height || !imageSourceSize?.width || !imageSourceSize?.height) {
    return null;
  }

  const scale = Math.min(imageFrame.width / imageSourceSize.width, imageFrame.height / imageSourceSize.height);
  const renderedWidth = imageSourceSize.width * scale;
  const renderedHeight = imageSourceSize.height * scale;

  return {
    scale,
    renderedWidth,
    renderedHeight,
    offsetX: (imageFrame.width - renderedWidth) / 2,
    offsetY: (imageFrame.height - renderedHeight) / 2,
    centerX: imageFrame.width / 2,
    centerY: imageFrame.height / 2,
  };
};

export const getContainedOverlayStyle = (item, metrics, options = {}) => {
  if (!metrics || item?.boxLeft == null || item?.boxTop == null || item?.boxWidth == null || item?.boxHeight == null) {
    return null;
  }

  const minWidth = options.minWidth ?? 52;
  const maxWidth = options.maxWidth ?? 96;
  const minHeight = options.minHeight ?? 24;
  const maxHeight = options.maxHeight ?? 32;
  const width = Math.min(
    Math.max(Math.min(Number(item.boxWidth) * metrics.scale, maxWidth), minWidth),
    metrics.renderedWidth
  );
  const height = Math.min(
    Math.max(Math.min(Number(item.boxHeight) * metrics.scale, maxHeight), minHeight),
    metrics.renderedHeight
  );
  const rawLeft = metrics.offsetX + (Number(item.boxLeft) * metrics.scale);
  const rawTop = metrics.offsetY + (Number(item.boxTop) * metrics.scale);

  return {
    left: Math.min(
      Math.max(rawLeft, metrics.offsetX),
      metrics.offsetX + metrics.renderedWidth - width
    ),
    top: Math.min(
      Math.max(rawTop, metrics.offsetY),
      metrics.offsetY + metrics.renderedHeight - height
    ),
    width,
    height,
  };
};
