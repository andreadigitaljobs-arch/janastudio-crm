import React from 'react';
import AstroDatePicker from './AstroDatePicker';

export const BirthdayTextInput = ({ value, onChange, style, className }) => {
  return (
    <div className={className} style={{ width: '100%', ...style }}>
      <AstroDatePicker value={value} onChange={onChange} />
    </div>
  );
};

export default BirthdayTextInput;
