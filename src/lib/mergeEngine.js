export function mergeForms(children, strategy) {
    const result = {};
    for (const [sectionId, strat] of Object.entries(strategy)) {
        const values = children.map((c) => { var _a; return (_a = c === null || c === void 0 ? void 0 : c.data) === null || _a === void 0 ? void 0 : _a[sectionId]; }).filter(Boolean);
        if (!values.length)
            continue;
        switch (strat) {
            case 'sum':
                result[sectionId] = values.reduce((a, b) => a + Number(b), 0);
                break;
            case 'avg':
                result[sectionId] = values.reduce((a, b) => a + Number(b), 0) / values.length;
                break;
            case 'max':
                result[sectionId] = Math.max(...values.map(Number));
                break;
            case 'min':
                result[sectionId] = Math.min(...values.map(Number));
                break;
            case 'concat':
                result[sectionId] = values.flat();
                break;
        }
    }
    return result;
}
