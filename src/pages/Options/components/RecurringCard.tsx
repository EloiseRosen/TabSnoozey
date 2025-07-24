import React from 'react';
import deleteIcon from '../../../assets/img/delete.svg';
import { formatReopenTime, formatRecurringSchedule } from '../formatting';

interface Props {
  id: string;
  url: string;
  title: string;
  nextOccurrence: number;
  config: Parameters<typeof formatRecurringSchedule>[0];
  onWakeNow: (url: string) => void;
  onDelete: (id: string) => void;
}

const RecurringCard: React.FC<Props> = ({
  id,
  url,
  title,
  nextOccurrence,
  config,
  onWakeNow,
  onDelete,
}) => (
  <li key={id} className="snoozed-item-card recurring-item">
    <div className="left-side-of-card">
      <a className="tab-title-link" href={url} target="_blank" rel="noreferrer">
        {title || url}
      </a>
      <div className="schedule-description">
        {formatRecurringSchedule(config)}
      </div>
      <div className="next-occurrence">
        Next: {formatReopenTime(nextOccurrence)}
      </div>
    </div>

    <div className="right-side-of-card">
      <button className="wake-now-button" onClick={() => onWakeNow(url)}>
        Wake Now
      </button>
      <button className="delete-button" onClick={() => onDelete(id)}>
        <img src={deleteIcon} alt="delete X" />
      </button>
    </div>
  </li>
);

export default RecurringCard;
