import React from 'react';

const ScreenshotFrame: React.FC<{
  title: string;
  description: string;
  alt: string;
  variant: 'phone' | 'tablet';
  imageSrc: string;
}> = ({ title, description, alt, variant, imageSrc }) => {
  const [failed, setFailed] = React.useState(false);
  const isPhone = variant === 'phone';

  return (
    <figure className="flex flex-col items-center">
      <div
        className={`relative overflow-hidden border border-secondary/20 bg-icon-purple-dark shadow-floating ${
          isPhone ? 'w-[220px] rounded-[2rem] p-2' : 'w-full max-w-md rounded-[1.25rem] p-2.5'
        }`}
      >
        <div className={`overflow-hidden bg-background ${isPhone ? 'rounded-[1.5rem]' : 'rounded-xl'}`}>
          {!failed ? (
            <img
              src={imageSrc}
              alt={alt}
              className="block h-auto w-full"
              loading="lazy"
              onError={() => setFailed(true)}
            />
          ) : (
            <div
              className={`flex flex-col items-center justify-center bg-background text-center ${
                isPhone ? 'aspect-[9/19.5] px-4' : 'aspect-[4/3] px-8'
              }`}
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-primary">Preview</p>
              <p className="mt-2 text-sm font-medium text-text">{title}</p>
              <p className="mt-1 text-xs text-secondary">
                {isPhone ? 'Android · Pixel 4 XL' : 'iPad simulator'}
              </p>
            </div>
          )}
        </div>
      </div>
      <figcaption className="mt-4 max-w-xs text-center">
        <h3 className="font-semibold text-text">{title}</h3>
        <p className="mt-1 text-sm text-secondary">{description}</p>
      </figcaption>
    </figure>
  );
};

export default ScreenshotFrame;
