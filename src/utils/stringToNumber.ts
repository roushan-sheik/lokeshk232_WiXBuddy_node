// Helper to transform string numbers safely
export const stringToNumber = (val: unknown) => {
    if (typeof val === 'string') {
        const num = parseInt(val);
        return isNaN(num) ? undefined : num;
    }
    if (typeof val === 'number') {
        return val;
    }
    return undefined;
};
