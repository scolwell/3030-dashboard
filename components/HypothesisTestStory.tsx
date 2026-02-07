import React from 'react';

const HypothesisTestStory: React.FC = () => {
  return (
    <div className="h-full w-full">
      <iframe
        src="/demos/story-of-uncertainty/index.html"
        className="w-full h-full border-none rounded-3xl"
        title="Story of Uncertainty"
        allow="fullscreen"
      />
    </div>
  );
};

export default HypothesisTestStory;
