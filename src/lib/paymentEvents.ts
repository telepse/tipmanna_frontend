type PaymentEvent = {
  tipAmount: number;
};

const listeners: ((data: PaymentEvent) => void)[] = [];

export const subscribeToPayments = (callback: (data: PaymentEvent) => void) => {
  listeners.push(callback);
  return () => {
    const index = listeners.indexOf(callback);
    if (index > -1) listeners.splice(index, 1);
  };
};

export const emitPaymentSuccess = (data: PaymentEvent) => {
  listeners.forEach(fn => fn(data));
};
