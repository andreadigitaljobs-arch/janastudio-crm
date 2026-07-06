import React from 'react';
import JanaDatePicker from './JanaDatePicker';

export const BirthdayTextInput = ({ value, onChange, style, className }) => {
  return (
    <div className={className} style={{ width: '100%', ...style }}>
      <JanaDatePicker value={value} onChange={onChange} />
    </div>
  );
};

export default BirthdayTextInput;
