/* eslint-disable @typescript-eslint/no-explicit-any */
export const getFormErrors = (errors: any): string[] => {
  const messages: string[] = [];

  const traverse = (errObj: any) => {
    Object.values(errObj).forEach((value: any) => {
      if (!value) return;

      if (value.message) {
        messages.push(value.message);
      }

      if (typeof value === "object") {
        traverse(value);
      }
    });
  };

  traverse(errors);
  return messages;
};
