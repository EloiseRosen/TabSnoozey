import React from 'react';
import deleteIcon from '../../../assets/img/delete.svg';
import { formatReopenTime } from '../formatting';

interface Props {
  id: string;
  url: string;
  title: string;
  reopenAt: number;
  onWakeNow: (id: string) => void;
  onDelete: (id: string) => void;
}

const OneOffCard: React.FC<Props> = ({
  id,
  url,
  title,
  reopenAt,
  onWakeNow,
  onDelete,
}) => (
  <li key={id} className="snoozed-item-card">
    <div className="left-side-of-card">
      <a className="tab-title-link" href={url} target="_blank" rel="noreferrer">
        {title || url}
      </a>
      <div className="wake-time-text">{formatReopenTime(reopenAt)}</div>
    </div>

    <div className="right-side-of-card">
      <button className="wake-now-button" onClick={() => onWakeNow(id)}>
        Wake Now
      </button>
      <button className="delete-button" onClick={() => onDelete(id)}>
        <img src={deleteIcon} alt="delete X" />
      </button>
    </div>
  </li>
);

export default OneOffCard;
