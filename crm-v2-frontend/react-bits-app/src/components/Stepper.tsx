import React, { useState, Children, useRef, useLayoutEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StepperProps {
  children: React.ReactNode;
  initialStep?: number;
  onStepChange?: (step: number) => void;
  onFinalStepCompleted?: () => void;
  stepCircleContainerClassName?: string;
  stepContainerClassName?: string;
  contentClassName?: string;
  footerClassName?: string;
  backButtonProps?: any;
  nextButtonProps?: any;
  backButtonText?: string;
  nextButtonText?: string;
  disableStepIndicators?: boolean;
  renderStepIndicator?: (step: number, isActive: boolean, isComplete: boolean) => React.ReactNode;
  [key: string]: any;
}

export default function Stepper({
  children,
  initialStep = 1,
  onStepChange = () => {},
  onFinalStepCompleted = () => {},
  stepCircleContainerClassName = '',
  stepContainerClassName = '',
  contentClassName = '',
  footerClassName = '',
  backButtonProps = {},
  nextButtonProps = {},
  backButtonText = 'Back',
  nextButtonText = 'Continue',
  disableStepIndicators = false,
  renderStepIndicator,
  ...rest
}: StepperProps) {
  const [currentStep, setCurrentStep] = useState(initialStep);
  const [direction, setDirection] = useState(0);
  const stepsArray = Children.toArray(children);
  const totalSteps = stepsArray.length;
  const isCompleted = currentStep > totalSteps;
  const isLastStep = currentStep === totalSteps;

  const updateStep = (newStep: number) => {
    setCurrentStep(newStep);
    if (newStep > totalSteps) onFinalStepCompleted?.();
    else onStepChange?.(newStep);
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setDirection(-1);
      updateStep(currentStep - 1);
    }
  };

  const handleNext = () => {
    if (!isLastStep) {
      setDirection(1);
      updateStep(currentStep + 1);
    }
  };

  const handleComplete = () => {
    setDirection(1);
    updateStep(totalSteps + 1);
  };

  return (
    <div
      className="flex w-full flex-col"
      {...rest}
    >
      <div
        className={`mx-auto w-full ${stepCircleContainerClassName}`}
      >
        <div className={`${stepContainerClassName} flex w-full items-center justify-center gap-2 p-6`}>
          {stepsArray.map((_, index) => {
            const stepNumber = index + 1;
            const isNotLastStep = index < totalSteps - 1;
            const isActive = stepNumber === currentStep;
            const isComplete = stepNumber < currentStep;
            return (
              <React.Fragment key={stepNumber}>
                {renderStepIndicator ? (
                  renderStepIndicator(stepNumber, isActive, isComplete)
                ) : (
                  <StepIndicator
                    step={stepNumber}
                    disableStepIndicators={disableStepIndicators}
                    currentStep={currentStep}
                    onClickStep={(clicked: number) => {
                      setDirection(clicked > currentStep ? 1 : -1);
                      updateStep(clicked);
                    }}
                  />
                )}
                {isNotLastStep && <StepConnector isComplete={currentStep > stepNumber} />}
              </React.Fragment>
            );
          })}
        </div>
        <StepContentWrapper
          isCompleted={isCompleted}
          currentStep={currentStep}
          direction={direction}
          className={`${contentClassName}`}
        >
          {stepsArray[currentStep - 1]}
        </StepContentWrapper>
        {!isCompleted && (
          <div className={`px-8 pb-8 ${footerClassName}`}>
            <div className={`mt-8 flex ${currentStep !== 1 ? 'justify-between' : 'justify-end'}`}>
              {currentStep !== 1 && (
                <button
                  onClick={handleBack}
                  className="rounded px-6 py-2 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
                  {...backButtonProps}
                >
                  {backButtonText}
                </button>
              )}
              <button
                onClick={isLastStep ? handleComplete : handleNext}
                className="flex items-center justify-center rounded-lg bg-purple-600 hover:bg-purple-700 py-3 px-8 font-bold text-white transition cursor-pointer z-10 relative pointer-events-auto"
                disabled={false}
                type="button"
                {...nextButtonProps}
              >
                {isLastStep ? '✨ Calculate Score' : nextButtonText}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface StepContentWrapperProps {
  isCompleted: boolean;
  currentStep: number;
  direction: number;
  children: React.ReactNode;
  className?: string;
}

function StepContentWrapper({ isCompleted, currentStep, direction, children, className }: StepContentWrapperProps) {
  const [parentHeight, setParentHeight] = useState(0);

  return (
    <motion.div
      style={{ position: 'relative', overflow: 'visible' }}
      animate={{ height: isCompleted ? 0 : parentHeight }}
      transition={{ type: 'spring', duration: 0.4 }}
      className={className}
    >
      <AnimatePresence initial={false} mode="wait" custom={direction}>
        {!isCompleted && (
          <SlideTransition key={currentStep} direction={direction} onHeightReady={(h) => setParentHeight(h)}>
            {children}
          </SlideTransition>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

interface SlideTransitionProps {
  children: React.ReactNode;
  direction: number;
  onHeightReady: (height: number) => void;
}

function SlideTransition({ children, direction, onHeightReady }: SlideTransitionProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    if (containerRef.current) onHeightReady(containerRef.current.offsetHeight);
  }, [children, onHeightReady]);

  return (
    <motion.div
      ref={containerRef}
      custom={direction}
      variants={stepVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3 }}
      style={{ position: 'relative', width: '100%', pointerEvents: 'auto' }}
    >
      {children}
    </motion.div>
  );
}

const stepVariants = {
  enter: (dir: number) => ({
    y: dir >= 0 ? 100 : -100,
    opacity: 0
  }),
  center: {
    y: 0,
    opacity: 1
  },
  exit: (dir: number) => ({
    y: dir >= 0 ? -100 : 100,
    opacity: 0
  })
};

export function Step({ children }: { children: React.ReactNode }) {
  return <div className="px-8 py-6">{children}</div>;
}

interface StepIndicatorProps {
  step: number;
  currentStep: number;
  onClickStep: (step: number) => void;
  disableStepIndicators: boolean;
}

function StepIndicator({ step, currentStep, onClickStep, disableStepIndicators }: StepIndicatorProps) {
  const status = currentStep === step ? 'active' : currentStep < step ? 'inactive' : 'complete';

  const handleClick = () => {
    if (step !== currentStep && !disableStepIndicators) onClickStep(step);
  };

  return (
    <motion.div
      onClick={handleClick}
      className="relative cursor-pointer outline-none focus:outline-none"
      animate={status}
      initial={false}
    >
      <motion.div
        variants={{
          inactive: { scale: 1, backgroundColor: 'var(--color-slate-200)', color: 'var(--color-slate-500)' },
          active: { scale: 1, backgroundColor: 'var(--color-primary)', color: 'white' },
          complete: { scale: 1, backgroundColor: 'var(--color-emerald-500)', color: 'white' }
        }}
        transition={{ duration: 0.3 }}
        className="flex h-10 w-10 items-center justify-center rounded-full font-semibold text-sm dark:bg-slate-800"
      >
        {status === 'complete' ? (
          <CheckIcon className="h-5 w-5" />
        ) : status === 'active' ? (
          <div className="h-2 w-2 rounded-full bg-white" />
        ) : (
          <span>{step}</span>
        )}
      </motion.div>
    </motion.div>
  );
}

interface StepConnectorProps {
  isComplete: boolean;
}

function StepConnector({ isComplete }: StepConnectorProps) {
  const lineVariants = {
    incomplete: { width: 0, backgroundColor: 'transparent' },
    complete: { width: '100%', backgroundColor: 'var(--color-emerald-500)' }
  };

  return (
    <div className="relative h-0.5 flex-1 overflow-hidden rounded bg-slate-300 dark:bg-slate-700">
      <motion.div
        className="absolute left-0 top-0 h-full"
        variants={lineVariants}
        initial={false}
        animate={isComplete ? 'complete' : 'incomplete'}
        transition={{ duration: 0.4 }}
      />
    </div>
  );
}

function CheckIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg {...props} fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <motion.path
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ delay: 0.1, type: 'tween', ease: 'easeOut', duration: 0.3 }}
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
