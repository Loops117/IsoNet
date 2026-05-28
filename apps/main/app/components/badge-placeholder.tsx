type BadgePlaceholderProps = {
  caption?: string;
};

export function BadgePlaceholder({
  caption = "We're still working on the official IsoNet badge. Check back soon.",
}: BadgePlaceholderProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="badge-placeholder">
        <div className="badge-placeholder__inner">
          <div className="badge-placeholder__label-group">
            <span className="badge-placeholder__label">IsoNet</span>
            <span className="badge-placeholder__sublabel">Badge</span>
          </div>
        </div>
      </div>
      <p className="badge-placeholder__caption">{caption}</p>
    </div>
  );
}
