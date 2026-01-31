import React from 'react';
import FundLab from './FundLab';

const FundPortfolio = () => {
    // This component acts as a wrapper to open FundLab directly on the Portfolio tab
    // We can pass a prop to FundLab to set default tab
    return <FundLab defaultTab="portfolio" />;
};

export default FundPortfolio;
