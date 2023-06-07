

// a typescript function that retry a promise according to option given

interface RetryOptions {
    retries: number;
    delay: number;
    onRetry: (error: Error, attempt: number) => void;
}

export const retry = <T>(fn: () => Promise<T>, options?: RetryOptions): Promise<T> => {
    const { retries, delay, onRetry } = options || { retries: 3, delay: 1000, onRetry: () => { } };
    return new Promise((resolve, reject) => {
        const attemptFn = (attempt: number) => {
            fn()
                .then(resolve)
                .catch(error => {
                    if (attempt === retries) {
                        reject(error);
                    } else {
                        onRetry(error, attempt);
                        setTimeout(() => attemptFn(attempt + 1), delay);
                    }
                });
        };
        attemptFn(1);
    });
}
