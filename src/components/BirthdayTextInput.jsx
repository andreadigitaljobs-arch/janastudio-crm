import React from 'react';
import JanaDatePicker from './JanaDatePicker';

export const BirthdayTextInput = ({ value, onChange, style, className, variant = "light", ...props }) => {
  return (
    <div style={{ width: '100%', ...style }} className={className}>
      <JanaDatePicker 
        value={value} 
        onChange={onChange} 
        variant={variant}
        {...props} 
      />
    </div>
  );
};

export default BirthdayTextInput;
