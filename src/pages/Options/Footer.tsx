import React from 'react';
import envelopeIcon from '../../assets/img/envelope.svg';
import personIcon from '../../assets/img/person.svg';
import coffeeMugIcon from '../../assets/img/coffee-mug.svg';

/**
 * The Footer component displays footer icons for navigation.
 */
const Footer: React.FC = () => {
  return (
    <div className="footer-icon-container">
      <a href="mailto:eloise.rosen+TabSnoozey@gmail.com" target="_blank" rel="noreferrer">
        <img src={envelopeIcon} alt="email" className="footer-icon" />
      </a>
      <a href="https://ELOISE-LIKES-MAKING-THINGS.com" target="_blank" rel="noreferrer">
        <img src={personIcon} alt="website" className="footer-icon" />
      </a>
      <a href="https://www.buymeacoffee.com/eloiserosen" target="_blank" rel="noreferrer">
        <img src={coffeeMugIcon} alt="support" className="footer-icon" />
      </a>
    </div>
  );
};

export default Footer;