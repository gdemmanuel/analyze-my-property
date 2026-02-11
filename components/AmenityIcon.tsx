import React from 'react';
import { Armchair, Waves, Thermometer, Gamepad2, Layers, Zap, Sparkles } from 'lucide-react';

export const getAmenityIcon = (iconName: string) => {
  switch (iconName) {
    case 'Armchair': return <Armchair size={16} />;
    case 'Waves': return <Waves size={16} />;
    case 'Thermometer': return <Thermometer size={16} />;
    case 'Gamepad2': return <Gamepad2 size={16} />;
    case 'Layers': return <Layers size={16} />;
    case 'Zap': return <Zap size={16} />;
    default: return <Sparkles size={16} />;
  }
};
