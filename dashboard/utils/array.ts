export const batch = async <T,Z>(myList: T[], fn: (chunk: T[]) => Promise<Z>) => {
    const batchSize = 100;
    return Promise.all(
        myList.reduce((acc: T[][], _, i) => {
            if (i % batchSize === 0) {
                acc.push(myList.slice(i, i + batchSize));
            }
            return acc;
        }, []).map(fn)
    )
}