interface StepIndicatorProps {
  step: number;
}

const steps = ["Basic Info", "Venue", "Planning", "Finance"];

export const StepIndicator = ({ step }: StepIndicatorProps) => {
  return (
    <div className="relative flex items-center justify-between">
      {steps.map((label, index) => {
        const active = index + 1 === step;
        const completed = index + 1 < step;

        return (
          <div
            key={index}
            className="flex flex-1 items-center"
          >
            {/* Step Circle */}
            <div className="relative flex items-center gap-4">
              <div
                className={`flex size-8 items-center justify-center rounded-full font-semibold transition duration-300 ${
                  active
                    ? "bg-primary scale-110 text-white"
                    : completed
                      ? "bg-primary text-white"
                      : "bg-gray-200 text-gray-600"
                }`}
              >
                {index + 1}
              </div>
              <span className="open_sans hidden text-sm font-medium sm:inline-block">
                {label}
              </span>
            </div>

            {/* Connector line (except last item) */}
            {index < steps.length - 1 && (
              <div
                className={`mx-4 h-[2px] flex-1 transition duration-300 ${
                  active || completed ? "bg-primary" : "bg-gray-200"
                }`}
              ></div>
            )}
          </div>
        );
      })}
    </div>
  );
};
