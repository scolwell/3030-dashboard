import React from 'react';
import SampleCloud from '../../components/SampleCloud';

interface SampleSceneProps {
  onSampleDrawn: (mean: number) => void;
  popMean: number;
  popStdDev: number;
  sampleSize: number;
}

const SampleScene: React.FC<SampleSceneProps> = ({ onSampleDrawn, popMean, popStdDev, sampleSize }) => {
  return <SampleCloud onSampleDrawn={onSampleDrawn} highlightSample={true} popMean={popMean} popStdDev={popStdDev} sampleSize={sampleSize} />;
};

export default SampleScene;
