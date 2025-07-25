import React from 'react';
import { createRoot } from 'react-dom/client';
import Options from './Options';
import './Options.css';

const container = document.getElementById('app-container');
const root = createRoot(container);
root.render(<Options />);
