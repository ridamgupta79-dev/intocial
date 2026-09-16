function StatCard({
  label,
  value,
  change,
  changeType = "",
}) {
  return (
    <div className="stat-card">
      <span className="stat-label">
        {label}
      </span>

      <strong className="stat-value">
        {value}
      </strong>

      <span className={`stat-change ${changeType}`}>
        {change}
      </span>
    </div>
  );
}

export default StatCard;