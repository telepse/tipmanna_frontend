interface StepIndicatorProps {
  step: number;
}

const steps = ["Amount to raise", "Host your event", "Submit for approval"];

export const NewStepIndicator = ({ step }: StepIndicatorProps) => {
  return (
    <div className="relative mt-4 flex items-center justify-between">
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
              {/* Active label above circle */}
              {active && (
                <span className="absolute -top-6 w-max text-center text-sm font-medium">
                  {label}
                </span>
              )}

              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full font-semibold transition duration-300 ${
                  active
                    ? "scale-110 bg-black text-white"
                    : completed
                      ? "bg-black text-white"
                      : "bg-gray-200 text-gray-800"
                }`}
              >
                {index + 1}
              </div>

              {/* Inactive labels next to circles (optional, can hide) */}
              {!active && (
                <span className="open_sans hidden text-sm font-medium sm:inline-block">
                  {label}
                </span>
              )}
            </div>

            {/* Connector line (except last item) */}
            {index < steps.length - 1 && (
              <div
                className={`mx-4 h-[2px] flex-1 transition duration-300 ${
                  completed ? "bg-black" : "bg-gray-300"
                }`}
              ></div>
            )}
          </div>
        );
      })}
    </div>
  );
};
