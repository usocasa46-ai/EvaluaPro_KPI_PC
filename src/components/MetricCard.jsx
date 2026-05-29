export default function MetricCard({ title, value, detail, tone = "neutral", icon: Icon }) {
  return (
    <article className={`metric-card metric-card--${tone}`}>
      <div className="metric-card__content">
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{detail}</small>
      </div>
      {Icon ? (
        <div className="metric-card__icon">
          <Icon size={20} strokeWidth={2.2} />
        </div>
      ) : null}
    </article>
  );
}
